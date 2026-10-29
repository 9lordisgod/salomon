#!/usr/bin/env bash
# Generate or verify SHA256SUMS for phase3-runtime/artifacts/*.gguf (single-file only)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ART="$ROOT/artifacts"
SUMS="$ART/SHA256SUMS"

usage() { echo "Usage: $0 generate|verify" >&2; exit 2; }
[[ $# -eq 1 ]] || usage
cmd="$1"
mkdir -p "$ART"
shopt -s nullglob
ggufs=( "$ART"/*.gguf )

# Fail closed on shard-style names
for g in "${ggufs[@]+"${ggufs[@]}"}"; do
  base="$(basename "$g")"
  if [[ "$base" == *"-of-"* ]] || [[ "$base" == *"00001"* ]]; then
    echo "REFUSE split-shard artifact: $base (M1 single-file only)" >&2
    exit 1
  fi
done

case "$cmd" in
  generate)
    if [[ ${#ggufs[@]} -eq 0 ]]; then
      echo "No *.gguf in $ART — run scripts/fetch_gguf.sh first." >&2
      exit 1
    fi
    (
      cd "$ART"
      if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -- *.gguf | sort -k2 > SHA256SUMS
      else
        shasum -a 256 -- *.gguf | sort -k2 > SHA256SUMS
      fi
    )
    echo "Wrote $SUMS"; cat "$SUMS"
    ;;
  verify)
    if [[ ! -f "$SUMS" ]]; then
      echo "Missing $SUMS" >&2; exit 1
    fi
    if [[ ${#ggufs[@]} -eq 0 ]]; then
      echo "No *.gguf to verify in $ART" >&2; exit 1
    fi
    (
      cd "$ART"
      if command -v sha256sum >/dev/null 2>&1; then
        sha256sum -c SHA256SUMS
      else
        shasum -a 256 -c SHA256SUMS
      fi
    )
    ;;
  *) usage ;;
esac
