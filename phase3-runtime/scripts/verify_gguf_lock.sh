#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/phase1-slm/models/gguf"
LOCK="$DIR/LOCK.json"
python3 - "$LOCK" "$DIR" <<'PY'
import hashlib, json, os, sys
lock = json.load(open(sys.argv[1]))
directory = sys.argv[2]
ok = True
for f in lock["artifacts"]["bartowski_single"]["files"]:
    path = os.path.join(directory, f["filename"])
    if not os.path.isfile(path):
        print(f"MISSING {f['filename']}"); ok = False; continue
    size = os.path.getsize(path)
    if size != f["bytes"]:
        print(f"SIZE MISMATCH {f['filename']}: {size} != {f['bytes']}"); ok = False
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    digest = h.hexdigest()
    if digest != f["sha256"]:
        print(f"SHA256 MISMATCH {f['filename']}"); ok = False
    else:
        print(f"OK {f['filename']} ({size} bytes)")
sys.exit(0 if ok else 1)
PY
