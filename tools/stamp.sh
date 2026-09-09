#!/bin/sh
# Rewrite every ?v=... in index.html to the current epoch, so a push can't leave the
# browser mixing new HTML with 10-minute-cached old JS.
V=$(date +%s)
R="$(dirname "$0")/.."
# Every page that pulls a module or a stylesheet of its own, not just the game — the
# bench pages get loaded on his phone too, which is exactly where a stale cache lies.
for f in index.html vo.html props.html; do
  sed -i -E "s/\?v=[0-9]+/?v=$V/g" "$R/$f"
done
echo "stamped $V"
