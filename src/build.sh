#!/bin/bash
# Build app.html from source modules
# Usage: ./build.sh [output_path]
# Default output: ../app.html

OUT="${1:-../app.html}"
DIR="$(cd "$(dirname "$0")" && pwd)"

# Order matters — later files reference earlier ones
FILES=(
  config.js
  data.js
  sync.js
  scan.js
  ui.js
  components.js
  views.js
  home.js
  transfer.js
  app.js
)

# HTML shell
cat "$DIR/shell_head.html" > "$OUT"
echo '<script>' >> "$OUT"

for f in "${FILES[@]}"; do
  if [ ! -f "$DIR/$f" ]; then
    echo "ERROR: Missing $DIR/$f" >&2
    exit 1
  fi
  cat "$DIR/$f" >> "$OUT"
done

echo '</script>' >> "$OUT"
echo '</body>' >> "$OUT"
echo '</html>' >> "$OUT"

# Count
LINES=$(wc -l < "$OUT")
echo "Built $OUT ($LINES lines)"
