# Export recipe — HF / adapter → GGUF → quant

**Do not run a “production” export until `../PIN.md` has real values (no `PIN_*`).**

## 0. Preconditions
- Model Engineer pin in `PIN.md`
- Abliterated / safety-stripped forks: **rejected** for Salomon privacy path
- Disk space ≈ 2× FP16 weights + GGUF quants
- Tools: `git`, Python 3.11+, [llama.cpp](https://github.com/ggerganov/llama.cpp) (`convert_hf_to_gguf.py` + `llama-quantize`)

## 1. Resolve weights
**Base-only pin:**
```bash
# huggingface-cli download PIN_BASE_MODEL_ID --local-dir ./hf-base
```

**Adapter pin:** merge LoRA into base per Model Engineer instructions (PEFT merge), write merged HF dir, then convert. Do not ship adapter-only GGUF unless they explicitly approve.

## 2. Convert to GGUF (F16)
From a llama.cpp checkout:
```bash
python convert_hf_to_gguf.py /path/to/hf-merged-or-base \
  --outfile /path/to/phase3-runtime/artifacts/PIN_BASENAME-f16.gguf \
  --outtype f16
```

## 3. Quantize
```bash
llama-quantize \
  /path/to/phase3-runtime/artifacts/PIN_BASENAME-f16.gguf \
  /path/to/phase3-runtime/artifacts/PIN_BASENAME.gguf \
  Q4_K_M
```
Use only quants listed in the pin. Remove the F16 intermediate from release uploads if not shipping it.

## 4. Checksums + manifest
```bash
cd phase3-runtime
./scripts/checksum_artifacts.sh generate
# Copy sha256 + byte size into MANIFEST.json from MANIFEST.template.json
```

## 5. Smoke
```bash
./scripts/checksum_artifacts.sh verify
# Then LOCAL_RUN.md one-shot; optional: Eval Lead refusal suite on GGUF (separate gate)
```

## Notes
- Web dogfood may use AI Gateway until local runtime is wired; this path remains the true local M1.
- Coordinate Platform for how CLI/installers discover `artifacts/` or a download URL.
