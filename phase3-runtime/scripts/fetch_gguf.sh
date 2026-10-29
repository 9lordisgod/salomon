#!/usr/bin/env bash
# Fetch bartowski single-file Q4_K_M → store as MANIFEST name in artifacts/ + models/gguf/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ART="$ROOT/phase3-runtime/artifacts"
CACHE="$ROOT/phase1-slm/models/gguf"
NAME='salomon-qwen25-7b-instruct-Q4_K_M.gguf'
UPSTREAM='Qwen2.5-7B-Instruct-Q4_K_M.gguf'
URL='https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q4_K_M.gguf'
WANT_SHA='65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423'
WANT_BYTES=4683074240

mkdir -p "$ART" "$CACHE"
dest="$ART/$NAME"

if [[ -f "$dest" ]]; then
  echo "Exists: $dest"
else
  tmp="$ART/.${NAME}.partial"
  if command -v huggingface-cli >/dev/null 2>&1; then
    huggingface-cli download bartowski/Qwen2.5-7B-Instruct-GGUF "$UPSTREAM" \
      --local-dir "$ART" --local-dir-use-symlinks False
    mv "$ART/$UPSTREAM" "$dest"
  else
    echo "Fetching $URL → $dest"
    curl -L --fail --retry 3 -o "$tmp" "$URL"
    mv "$tmp" "$dest"
  fi
fi

ln "$dest" "$CACHE/$NAME" 2>/dev/null || cp -f "$dest" "$CACHE/$NAME"

python3 - "$dest" "$WANT_SHA" "$WANT_BYTES" <<'PY'
import hashlib, os, sys
path, want_sha, want_bytes = sys.argv[1], sys.argv[2], int(sys.argv[3])
size = os.path.getsize(path)
if size != want_bytes:
    raise SystemExit(f"SIZE MISMATCH: got {size} want {want_bytes}")
h = hashlib.sha256()
with open(path, "rb") as f:
    for chunk in iter(lambda: f.read(1024 * 1024), b""):
        h.update(chunk)
got = h.hexdigest()
if got != want_sha:
    raise SystemExit(f"SHA256 MISMATCH: got {got} want {want_sha}")
print(f"OK {os.path.basename(path)} sha256={got} bytes={size}")
PY

echo "$WANT_SHA  $NAME" > "$ART/SHA256SUMS"
echo "$WANT_SHA  $NAME" > "$CACHE/SHA256SUMS"
"$ROOT/phase3-runtime/scripts/checksum_artifacts.sh" verify
echo "fetch_gguf: PASS"
echo "export SALOMON_GGUF=$dest"
