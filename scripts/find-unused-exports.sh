#!/bin/bash
# Find unused exports in packages/sdk

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Unused Exports Audit${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Workspaces to scan for exports
WORKSPACES=(
    "./packages/types"
    "./packages/sdk"
    "./packages/api"
    "./packages/mobile"
    "./apps/backend"
    "./apps/frontend"
)

EXISTING_WORKSPACES=()
for ws in "${WORKSPACES[@]}"; do
    if [ -d "$ws" ]; then
        EXISTING_WORKSPACES+=("$ws")
    fi
done

if [ ${#EXISTING_WORKSPACES[@]} -eq 0 ]; then
    echo -e "${RED}❌ No workspaces found to scan${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Scanning workspaces: ${EXISTING_WORKSPACES[*]}${NC}"
echo ""

# Find all exported items
echo -e "${YELLOW}📋 Finding all exports...${NC}"

# Extract all exports as "<relative/path/to/file.ts>:<line>:<exportName>"
# This is the format consumed by scripts/remove-unused-exports.sh.
: > /tmp/all_exports.txt
for ws in "${EXISTING_WORKSPACES[@]}"; do
    while IFS= read -r file; do
        # Strip leading "./" so paths are workspace-relative
        rel_file="${file#./}"
        grep -nE "^(export )?(const|function|class|interface|type|enum|let|var) [a-zA-Z_][a-zA-Z0-9_]*" "$file" 2>/dev/null | \
          awk -v f="$rel_file" -F: '{
              line = $1
              rest = $0
              sub(/^[0-9]+:/, "", rest)
              sub(/^export /, "", rest)
              sub(/^(const|function|class|interface|type|enum|let|var) /, "", rest)
              match(rest, /^[a-zA-Z_][a-zA-Z0-9_]*/)
              name = substr(rest, RSTART, RLENGTH)
              if (name != "") print f ":" line ":" name
          }' >> /tmp/all_exports.txt
    done < <(find "$ws" -name "*.ts" -type f \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.next/*" 2>/dev/null)
done
sort -u /tmp/all_exports.txt -o /tmp/all_exports.txt

TOTAL_EXPORTS=$(wc -l < /tmp/all_exports.txt)
echo -e "  ${GREEN}Found $TOTAL_EXPORTS total exports${NC}"

# Check each export for usage outside its defining file
echo ""
echo -e "${YELLOW}📋 Checking for unused exports...${NC}"

USED_EXPORTS=()
UNUSED_EXPORTS=()

while IFS= read -r entry; do
    if [ -z "$entry" ]; then
        continue
    fi

    # entry format: <relative/path/to/file.ts>:<line>:<exportName>
    export_name="${entry##*:}"
    defining_file="${entry%:*:*}"
    defining_file="${defining_file%:*}"

    if [ -z "$export_name" ]; then
        continue
    fi

    # Count usages of the export name in files other than its defining file
    USAGE_COUNT=$(grep -r "\b${export_name}\b" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next 2>/dev/null | \
        grep -v "node_modules" | \
        grep -v "^\./${defining_file}:" | \
        wc -l)

    if [ "$USAGE_COUNT" -eq 0 ]; then
        UNUSED_EXPORTS+=("$entry")
        echo -e "  ${RED}❌ Unused export: $entry${NC}"
    else
        USED_EXPORTS+=("$entry")
    fi
done < /tmp/all_exports.txt

# Write unused exports list (file:line:name) for scripts/remove-unused-exports.sh
: > /tmp/unused_exports.txt
for entry in "${UNUSED_EXPORTS[@]}"; do
    echo "$entry" >> /tmp/unused_exports.txt
done

TOTAL_UNUSED=${#UNUSED_EXPORTS[@]}
TOTAL_USED=${#USED_EXPORTS[@]}

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${GREEN}Used exports: $TOTAL_USED${NC}"
echo -e "  ${RED}Unused exports: $TOTAL_UNUSED${NC}"

if [ $TOTAL_UNUSED -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Unused exports to remove:${NC}"
    for entry in "${UNUSED_EXPORTS[@]}"; do
        echo "  - $entry"
    done
fi

echo ""
echo -e "${GREEN}✅ Audit complete!${NC}"

if [ $TOTAL_UNUSED -gt 0 ]; then
    echo -e "${RED}❌ $TOTAL_UNUSED unused export(s) found. See /tmp/unused_exports.txt${NC}"
    exit 1
fi

echo -e "${GREEN}✅ No unused exports found.${NC}"
exit 0
