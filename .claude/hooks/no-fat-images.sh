#!/usr/bin/env bash
# Blocks `git add` / `git commit` when an oversized photo is about to enter history.
#
# .git is already ~137MB against a ~129MB photo set. Every committed copy of a photo
# is permanent, so the only reliable place to stop the ratchet is before the add.
# Only newly added or modified files are checked — photos already in history are
# grandfathered, otherwise this would block every commit forever.

set -uo pipefail

MAX_BYTES=$((800 * 1024))
WATCHED_DIR="src/assets/photos"

input=$(cat)

command=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1)

case "$command" in
  *"git add"*|*"git commit"*) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
[ -d "$WATCHED_DIR" ] || exit 0

offenders=""
while IFS= read -r line; do
  status="${line:0:2}"
  file="${line:3}"

  case "$status" in
    ' D'|'D '|'DD') continue ;;
  esac
  case "$file" in
    "$WATCHED_DIR"/*) ;;
    *) continue ;;
  esac
  [ -f "$file" ] || continue

  size=$(wc -c < "$file" 2>/dev/null | tr -d ' ')
  [ -n "$size" ] || continue

  if [ "$size" -gt "$MAX_BYTES" ]; then
    offenders="${offenders}  $(( size / 1024 ))KB  ${file}"$'\n'
  fi
done < <(git status --porcelain -- "$WATCHED_DIR" 2>/dev/null)

if [ -n "$offenders" ]; then
  {
    echo "Blocked: these new/modified photos are over $(( MAX_BYTES / 1024 ))KB:"
    echo ""
    printf '%s' "$offenders"
    echo ""
    echo "Run 'npm run optimize' first (it resizes to 2560px / mozjpeg q85 in place),"
    echo "then stage again. Astro generates the responsive variants at build time, so"
    echo "the committed file only needs to be a sane master — not the camera original."
  } >&2
  exit 2
fi

exit 0
