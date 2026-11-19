#!/bin/bash
# Remove unused exports across all workspaces

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

UNUSED_FILE="/tmp/unused_exports.txt"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Removing Unused Exports${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ ! -f "$UNUSED_FILE" ]; then
    echo -e "${RED}❌ No unused exports list found at $UNUSED_FILE. Run scripts/find-unused-exports.sh first${NC}"
    exit 1
fi

if [ ! -s "$UNUSED_FILE" ]; then
    echo -e "${GREEN}✅ No unused exports to remove. Checker already reports zero.${NC}"
    exit 0
fi

# Create backup of all workspaces
BACKUP_DIR="./backups/workspaces-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
for pkg in packages/*/; do
    if [ -d "$pkg" ]; then
        pkg_name="$(basename "$pkg")"
        cp -r "$pkg" "$BACKUP_DIR/$pkg_name" 2>/dev/null || true
    fi
done

echo -e "${GREEN}📦 Backup saved to $BACKUP_DIR${NC}"
echo ""

# Expected line format from find-unused-exports.sh:
#   <relative/path/to/file.ts>:<line>:<exportName>
# Malformed entries are treated as hard errors so the report can be fixed
# rather than silently ignored.
REMOVED=0
SKIPPED=0
ERRORS=0

# Barrel files re-export the public surface of a package. Un-exporting a
# symbol from a barrel would break consumers, so they are never edited.
is_barrel_file() {
    case "$1" in
        */index.ts|*/index.tsx|*/index.js|*/index.jsx) return 0 ;;
        *) return 1 ;;
    esac
}

while IFS= read -r line; do
    # Trim leading/trailing whitespace
    line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -z "$line" ] && continue

    # Parse file:line:exportName
    file="${line%%:*}"
    rest="${line#*:}"
    lineno="${rest%%:*}"
    export_name="${rest#*:}"

    if [ -z "$file" ] || [ -z "$lineno" ] || [ -z "$export_name" ] || [ "$file" = "$line" ] \
        || ! [[ "$lineno" =~ ^[0-9]+$ ]]; then
        echo -e "  ${RED}❌ Malformed entry in $UNUSED_FILE: $line${NC}"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    if [ ! -f "$file" ]; then
        echo -e "  ${RED}❌ File not found for entry: $file${NC}"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    if is_barrel_file "$file"; then
        echo -e "  ${YELLOW}⚠️  Skipping barrel file (never edited): $file${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Re-verify the symbol is genuinely unreferenced before editing. Look for
    # any import/usage of the name outside the declaring file itself.
    if grep -rqE "(^|[^[:alnum:]_$])${export_name}([^[:alnum:]_$]|$)" \
        --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
        --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
        . 2>/dev/null; then
        refs="$(grep -rlE "(^|[^[:alnum:]_$])${export_name}([^[:alnum:]_$]|$)" \
            --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
            --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
            . 2>/dev/null | grep -v "^\./${file}$" || true)"
        if [ -n "$refs" ]; then
            echo -e "  ${YELLOW}⚠️  Still referenced, skipping: $export_name ($file:$lineno)${NC}"
            echo -e "      Referenced in: $(echo "$refs" | tr '\n' ' ')${NC}"
            SKIPPED=$((SKIPPED + 1))
            continue
        fi
    fi

    # Un-export the symbol on the given line by removing the leading `export `
    # keyword (and optional `default`). This preserves the declaration while
    # eliminating the dead export. Only touch the line if it actually contains
    # the expected export.
    if sed -n "${lineno}p" "$file" | grep -qE "(^|[[:space:]])export[[:space:]]"; then
        # Use a temp file for a portable in-place edit
        tmp_file="$(mktemp)"
        awk -v target="$lineno" '
            NR == target {
                # Remove leading "export " or "export default "
                sub(/^([[:space:]]*)export[[:space:]]+default[[:space:]]+/, "\\1")
                sub(/^([[:space:]]*)export[[:space:]]+/, "\\1")
            }
            { print }
        ' "$file" > "$tmp_file"
        mv "$tmp_file" "$file"
        echo -e "  ${GREEN}✅ Un-exported: $export_name ($file:$lineno)${NC}"
        REMOVED=$((REMOVED + 1))
    else
        echo -e "  ${RED}❌ No export found at $file:$lineno for: $export_name${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done < "$UNUSED_FILE"

echo ""
echo -e "${GREEN}✅ Removal complete!${NC}"
echo -e "   Un-exported: ${GREEN}$REMOVED${NC}"
echo -e "   Skipped:     ${YELLOW}$SKIPPED${NC}"
echo -e "   Errors:      ${RED}$ERRORS${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ $ERRORS malformed or unresolvable entr(ies) found in $UNUSED_FILE.${NC}"
    echo -e "${YELLOW}   Fix the report (or the source) and re-run.${NC}"
    exit 1
fi

# Re-run the checker to verify zero unused exports remain
echo -e "${BLUE}🔍 Re-running unused-export checker to verify...${NC}"
echo ""

if [ -x "$SCRIPT_DIR/find-unused-exports.sh" ]; then
    if "$SCRIPT_DIR/find-unused-exports.sh"; then
        if [ -f "$UNUSED_FILE" ] && [ -s "$UNUSED_FILE" ]; then
            remaining="$(grep -cve '^[[:space:]]*$' "$UNUSED_FILE" || true)"
            echo ""
            echo -e "${RED}❌ Checker still reports $remaining unused export(s).${NC}"
            echo -e "${YELLOW}   Review $UNUSED_FILE and remove remaining entries manually.${NC}"
            exit 1
        fi
        echo ""
        echo -e "${GREEN}✅ Checker reports zero unused exports.${NC}"
    else
        echo ""
        echo -e "${RED}❌ Checker failed. Please review output above.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  scripts/find-unused-exports.sh not found or not executable; skipping verification.${NC}"
fi