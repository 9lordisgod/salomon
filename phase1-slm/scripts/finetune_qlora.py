#!/usr/bin/env python3
"""QLoRA fine-tuning on messages-format JSONL. Falls back to plain LoRA (fp32/bf16)
when bitsandbytes or CUDA is unavailable (for example, CPU smoke tests with a 0.5B model)."""
import argparse, json, torch
from datasets import Dataset
from transformers import (AutoModelForCausalLM, AutoTokenizer, Trainer,
                          TrainingArguments, DataCollatorForLanguageModeling)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

def args():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="Qwen/Qwen2.5-7B-Instruct")
    p.add_argument("--data", default="data/seed_prompts.jsonl")
    p.add_argument("--output", default="outputs/qlora-adapter")
    p.add_argument("--epochs", type=float, default=3)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--batch-size", type=int, default=2)
    p.add_argument("--grad-accum", type=int, default=8)
    p.add_argument("--max-len", type=int, default=2048)
    p.add_argument("--lora-r", type=int, default=16)
    p.add_argument("--max-samples", type=int, default=0, help="0=all; use small N for dry runs")
    p.add_argument("--max-steps", type=int, default=-1)
    p.add_argument("--no-4bit", action="store_true")
    return p.parse_args()

def main():
    a = args()
    use_4bit = not a.no_4bit and torch.cuda.is_available()
    if use_4bit:
        try:
            import bitsandbytes  # noqa
            from transformers import BitsAndBytesConfig
        except ImportError:
            print("[warn] bitsandbytes missing -> plain LoRA"); use_4bit = False
    tok = AutoTokenizer.from_pretrained(a.model)
    if tok.pad_token is None: tok.pad_token = tok.eos_token
    kw = {}
    if use_4bit:
        kw["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.bfloat16)
        kw["device_map"] = "auto"
    elif torch.cuda.is_available():
        kw["torch_dtype"] = torch.bfloat16; kw["device_map"] = "auto"
    model = AutoModelForCausalLM.from_pretrained(a.model, **kw)
    if use_4bit: model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(r=a.lora_r, lora_alpha=2*a.lora_r, lora_dropout=0.05,
        task_type="CAUSAL_LM", target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]))
    model.print_trainable_parameters()

    rows = [json.loads(l) for l in open(a.data) if l.strip()]
    if a.max_samples: rows = rows[:a.max_samples]
    texts = [tok.apply_chat_template(r["messages"], tokenize=False) for r in rows]
    ds = Dataset.from_dict({"text": texts}).map(
        lambda b: tok(b["text"], truncation=True, max_length=a.max_len), batched=True, remove_columns=["text"])
    tr = Trainer(model=model, train_dataset=ds,
        data_collator=DataCollatorForLanguageModeling(tok, mlm=False),
        args=TrainingArguments(output_dir=a.output, num_train_epochs=a.epochs, max_steps=a.max_steps,
            per_device_train_batch_size=a.batch_size, gradient_accumulation_steps=a.grad_accum,
            learning_rate=a.lr, warmup_steps=0 if a.max_steps > 0 else 10, logging_steps=1, save_strategy="epoch",
            bf16=torch.cuda.is_available(), report_to=[]))
    tr.train()
    model.save_pretrained(a.output); tok.save_pretrained(a.output)
    print(f"adapter saved -> {a.output}")

if __name__ == "__main__":
    main()
