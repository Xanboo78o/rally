#!/bin/sh
# Rewrite every ?v=... in index.html to the current epoch, so a push can't leave the
# browser mixing new HTML with 10-minute-cached old JS.
V=$(date +%s)
sed -i -E "s/\?v=[0-9]+/?v=$V/g" "$(dirname "$0")/../index.html"
echo "stamped $V"
