SMOKE=Qwen/Qwen2.5-0.5B-Instruct
MODEL?=Qwen/Qwen2.5-7B-Instruct
install: ; pip install -r requirements.txt
data: ; python scripts/prepare_domain_data.py && python scripts/dataset_check.py
dryrun: ; python scripts/finetune_qlora.py --model $(SMOKE) --max-samples 8 --max-steps 2 --batch-size 1 --grad-accum 1 --output outputs/dryrun
train: ; python scripts/finetune_qlora.py --model $(MODEL)
smoke: ; python scripts/local_inference.py --model $(SMOKE) --prompt "How should I keep source names out of a shared research memo?" --max-new 128
eval: ; python scripts/eval_harness.py --model $(MODEL) $(if $(ADAPTER),--adapter $(ADAPTER),)
# CI safety gate: use eval-refusal (refusal suite only, always data/eval_refusal.jsonl, fails non-zero). `eval` is informational + safety.
eval-refusal: ; NEAR_PRIVACY_CI=1 .venv/bin/python scripts/eval_harness.py --model $(SMOKE) --refusal-only --require-refusal --refusal data/eval_refusal.jsonl --out outputs/eval_refusal_results.jsonl
test-safety: ; .venv/bin/python scripts/test_safety_unit.py
# 7B refusal gate (GPU, not run on CPU box). Loads bf16 (~16GB+ VRAM); see EVAL_REFUSAL_7B.md.
eval-refusal-7b: ; NEAR_PRIVACY_CI=1 .venv/bin/python scripts/eval_harness.py --model Qwen/Qwen2.5-7B-Instruct --refusal-only --require-refusal --refusal data/eval_refusal.jsonl --out outputs/eval_refusal_7b_results.jsonl
# First real adapter on CPU (0.5B, full seed data) + baseline vs tuned report. See FIRST_ADAPTER_0.5B.md.
train-cpu: ; .venv/bin/python scripts/finetune_qlora.py --model $(SMOKE) --epochs 2 --batch-size 2 --grad-accum 4 --max-len 512 --output outputs/lora-0.5b-cpu
eval-base-cpu: ; HF_HUB_OFFLINE=1 .venv/bin/python scripts/eval_harness.py --model $(SMOKE) --max-new 200 --out outputs/eval_base_0.5b.jsonl || true
eval-tuned-cpu: ; HF_HUB_OFFLINE=1 .venv/bin/python scripts/eval_harness.py --model $(SMOKE) --adapter outputs/lora-0.5b-cpu --max-new 200 --out outputs/eval_tuned_0.5b.jsonl || true
compare-cpu: ; .venv/bin/python scripts/compare_evals.py --base outputs/eval_base_0.5b.jsonl --tuned outputs/eval_tuned_0.5b.jsonl --out outputs/eval_compare_0.5b.md --base-label "Qwen2.5-0.5B base" --tuned-label "Qwen2.5-0.5B + LoRA (235 rows, 2 ep)"
first-adapter-cpu: train-cpu eval-base-cpu eval-tuned-cpu compare-cpu

# Phase 3 M1 — offline ask (GGUF product; transformers CI)
ask-local: ; python scripts/ask_local.py --prompt "$(PROMPT)"
fetch-gguf-smoke: ; scripts/fetch_gguf.sh smoke
fetch-gguf-product: ; scripts/fetch_gguf.sh product
smoke-ask-refusal: ; scripts/smoke_ask_refusal.sh
# Privacy-rebuild refusal gate on the pinned LOCAL GGUF (CPU, offline netns, product system prompt). See EVAL_REFUSAL_GGUF.md.
eval-refusal-gguf: ; SALOMON_NETNS=1 unshare -rn .venv/bin/python scripts/eval_refusal_gguf.py --gguf $(or $(GGUF),models/gguf/salomon-qwen25-7b-instruct-Q4_K_M.gguf) --out outputs/eval_refusal_gguf_7b/results.jsonl --summary outputs/eval_refusal_gguf_7b/summary.md
