#!/bin/bash
# Audit import ordering in the monorepo

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Import Ordering Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check for import issues
echo -e "${YELLOW}📋 Checking import ordering...${NC}"

VIOLATIONS=0

# Use a temp file to accumulate violations from the subshell (pipe) below
TMP_VIOLATIONS=$(mktemp)
trap 'rm -f "$TMP_VIOLATIONS"' EXIT

find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.next/*" \
  -not -path "*/coverage/*" \
  | while read -r file; do
    # Check for imports that might be out of order
    if grep -q "import.*from.*\\.\\./" "$file"; then
      # Check relative imports after absolute imports
      if grep -q "import.*from.*@/" "$file"; then
        # Check if relative imports come before absolute
        if grep -B 10 "import.*from.*\\.\\./" "$file" | grep -q "import.*from.*@/"; then
          echo -e "  ${RED}❌ $file: Mixed import ordering${NC}"
          echo "1" >> "$TMP_VIOLATIONS"
        fi
      fi
    fi
  done

if [ -s "$TMP_VIOLATIONS" ]; then
  VIOLATIONS=$(wc -l < "$TMP_VIOLATIONS" | tr -d ' ')
fi

if [ "$VIOLATIONS" -eq 0 ]; then
  echo -e "${GREEN}✅ No import ordering issues found${NC}"
else
  echo -e "${RED}❌ Found $VIOLATIONS import ordering issues${NC}"
  echo -e "${YELLOW}Run ./scripts/fix-imports.sh to fix${NC}"
fi

echo ""
echo -e "${YELLOW}📋 Checking for orphaned assets...${NC}"

ASSET_VIOLATIONS=0
ASSETS_DIR="apps/frontend/public"

if [ -d "$ASSETS_DIR" ]; then
  # Collect all source files that could reference assets
  SRC_FILES=$(find apps/frontend/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.scss" -o -name "*.mdx" \) -not -path "*/node_modules/*" 2>/dev/null || true)

  while IFS= read -r asset; do
    # Skip empty lines
    [ -z "$asset" ] && continue

    # Compute the asset path relative to the public directory (e.g. /images/logo.png)
    rel_path="${asset#"$ASSETS_DIR"}"
    # Also compute the bare filename for looser matching
    base_name=$(basename "$asset")

    referenced=0

    if [ -n "$SRC_FILES" ]; then
      # Look for references to the asset path or its basename in source files
      if echo "$SRC_FILES" | xargs grep -l -F -e "$rel_path" -e "$base_name" 2>/dev/null | grep -q .; then
        referenced=1
      fi
    fi

    if [ "$referenced" -eq 0 ]; then
      echo -e "  ${RED}❌ $asset: Orphaned asset (not referenced by any src file)${NC}"
      ASSET_VIOLATIONS=$((ASSET_VIOLATIONS + 1))
    fi
  done < <(find "$ASSETS_DIR" -type f \
    -not -path "*/node_modules/*" \
    -not -name ".DS_Store" \
    -not -name "*.map" \
    2>/dev/null || true)
else
  echo -e "  ${YELLOW}⚠️  $ASSETS_DIR not found, skipping orphaned asset check${NC}"
fi

if [ "$ASSET_VIOLATIONS" -eq 0 ]; then
  echo -e "${GREEN}✅ No orphaned assets found${NC}"
else
  echo -e "${RED}❌ Found $ASSET_VIOLATIONS orphaned assets${NC}"
  echo -e "${YELLOW}Remove unreferenced files or add them to the knip ignore list${NC}"
fi

echo ""

TOTAL_VIOLATIONS=$((VIOLATIONS + ASSET_VIOLATIONS))

if [ "$TOTAL_VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}❌ Audit failed with $TOTAL_VIOLATIONS violation(s)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Audit complete!${NC}"
exit 0