#!/usr/bin/env bash
# First real adapter on CPU: Qwen2.5-0.5B-Instruct + LoRA on full seed data, then
# baseline vs tuned eval (same harness, data, system prompt) and a markdown compare report.
# Mirrors Makefile target first-adapter-cpu for boxes without make. Run from phase1-slm/.
set -uo pipefail
PY=.venv/bin/python; M=Qwen/Qwen2.5-0.5B-Instruct; AD=outputs/lora-0.5b-cpu
$PY scripts/finetune_qlora.py --model $M --epochs 2 --lr ${LR:-1e-4} --batch-size 2 --grad-accum 4 --max-len 512 --output $AD || exit 1
export HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
$PY scripts/eval_harness.py --model $M --max-new 200 --out outputs/eval_base_0.5b.jsonl
$PY scripts/eval_harness.py --model $M --adapter $AD --max-new 200 --out outputs/eval_tuned_0.5b.jsonl
$PY scripts/compare_evals.py --base outputs/eval_base_0.5b.jsonl --tuned outputs/eval_tuned_0.5b.jsonl \
  --out outputs/eval_compare_0.5b.md --base-label "Qwen2.5-0.5B base" --tuned-label "Qwen2.5-0.5B + LoRA (315 rows, 2 ep, lr 1e-4)"
echo "compare exit=$?"
