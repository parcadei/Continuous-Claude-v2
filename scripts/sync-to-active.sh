#!/usr/bin/env bash
# Sync continuous-claude/.claude/ → ~/.claude/ (forward sync)
# Run after git pull or local edits in continuous-claude

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
REPO_CLAUDE="$REPO_ROOT/.claude"
ACTIVE_CLAUDE="$HOME/.claude"

DRY_RUN=false
VERBOSE=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --help|-h)
            echo "Usage: $0 [--dry-run] [--verbose] [--skip-build]"
            echo ""
            echo "Syncs continuous-claude/.claude/ → ~/.claude/"
            echo ""
            echo "Options:"
            echo "  --dry-run     Show what would be copied without copying"
            echo "  --verbose     Show detailed progress"
            echo "  --skip-build  Skip npm build for hooks"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

$VERBOSE && echo "Syncing: $REPO_CLAUDE → $ACTIVE_CLAUDE" || true

SYNC_DIRS="hooks/src rules agents skills docs"

NEVER_SYNC="CLAUDE.md RULES.md .env .credentials.json settings.json history.jsonl knowledge-tree.json"

copy_dir() {
    local dir="$1"
    local src_path="$REPO_CLAUDE/$dir"
    local dst_path="$ACTIVE_CLAUDE/$dir"

    [[ ! -d "$src_path" ]] && return 0

    $DRY_RUN || mkdir -p "$dst_path"

    while IFS= read -r src_file; do
        local rel="${src_file#$src_path/}"
        local dst_file="$dst_path/$rel"

        local base=$(basename "$src_file")
        local skip_file=false
        for skip in $NEVER_SYNC; do
            [[ "$base" == "$skip" ]] && skip_file=true && break
        done
        $skip_file && continue

        if $DRY_RUN; then
            echo "[DRY RUN] Would copy: $src_file -> $dst_file"
        else
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: $dir/$rel" || true
        fi
    done < <(find "$src_path" -type f ! -name "*.pid" ! -name "*.lock" ! -path "*/.tldr/*" ! -path "*/node_modules/*" ! -path "*/cache/*" ! -path "*/dist/*" 2>/dev/null)
}

for dir in $SYNC_DIRS; do
    copy_dir "$dir"
done

for pattern in "hooks/*.sh" "hooks/*.py" "hooks/*.mjs" "hooks/*.ps1" "hooks/package.json" "hooks/tsconfig.json"; do
    for src_file in $REPO_CLAUDE/$pattern; do
        [[ ! -f "$src_file" ]] && continue
        rel="${src_file#$REPO_CLAUDE/}"
        dst_file="$ACTIVE_CLAUDE/$rel"

        if $DRY_RUN; then
            echo "[DRY RUN] Would copy: $src_file -> $dst_file"
        else
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: $rel" || true
        fi
    done
done

# Sync hooks/dist/*.mjs (built hook bundles)
DIST_SRC="$REPO_CLAUDE/hooks/dist"
DIST_DST="$ACTIVE_CLAUDE/hooks/dist"
if [[ -d "$DIST_SRC" ]]; then
    $DRY_RUN || mkdir -p "$DIST_DST"
    for src_file in "$DIST_SRC"/*.mjs; do
        [[ ! -f "$src_file" ]] && continue
        local_name=$(basename "$src_file")
        dst_file="$DIST_DST/$local_name"
        if $DRY_RUN; then
            echo "[DRY RUN] Would copy: $src_file -> $dst_file"
        else
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: hooks/dist/$local_name" || true
        fi
    done
fi

# Sync templates/ralph/ (prompt templates for Ralph agents)
TEMPLATES_SRC="$REPO_CLAUDE/templates/ralph"
TEMPLATES_DST="$ACTIVE_CLAUDE/templates/ralph"
if [[ -d "$TEMPLATES_SRC" ]]; then
    $DRY_RUN || mkdir -p "$TEMPLATES_DST"
    for src_file in "$TEMPLATES_SRC"/*; do
        [[ ! -f "$src_file" ]] && continue
        local_name=$(basename "$src_file")
        dst_file="$TEMPLATES_DST/$local_name"
        if $DRY_RUN; then
            echo "[DRY RUN] Would copy: $src_file -> $dst_file"
        else
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: templates/ralph/$local_name" || true
        fi
    done
fi

# Sync scripts/ralph/*.py (create target directory if needed for fresh installs)
RALPH_SRC="$REPO_CLAUDE/scripts/ralph"
RALPH_DST="$ACTIVE_CLAUDE/scripts/ralph"
if [[ -d "$RALPH_SRC" ]]; then
    $DRY_RUN || mkdir -p "$RALPH_DST"
    for src_file in "$RALPH_SRC"/*.py; do
        [[ ! -f "$src_file" ]] && continue
        local_name=$(basename "$src_file")
        dst_file="$RALPH_DST/$local_name"
        if $DRY_RUN; then
            echo "[DRY RUN] Would copy: $src_file -> $dst_file"
        else
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: scripts/ralph/$local_name" || true
        fi
    done
fi

if ! $DRY_RUN && ! $SKIP_BUILD; then
    if [[ -f "$ACTIVE_CLAUDE/hooks/package.json" ]]; then
        echo "Rebuilding hooks..."
        cd "$ACTIVE_CLAUDE/hooks"
        if [[ -f "build.sh" ]]; then
            bash build.sh
        elif command -v npm &> /dev/null; then
            npm run build 2>/dev/null || echo "Warning: Hook build failed"
        fi
    fi
fi

# Merge mcpServers from repo settings.json into active settings.json
# This preserves machine-specific settings while syncing MCP server config
if ! $DRY_RUN && command -v jq &> /dev/null; then
    REPO_SETTINGS="$REPO_CLAUDE/settings.json"
    ACTIVE_SETTINGS="$ACTIVE_CLAUDE/settings.json"

    if [[ -f "$REPO_SETTINGS" && -f "$ACTIVE_SETTINGS" ]]; then
        # Extract mcpServers from repo and merge into active
        MCP_SERVERS=$(jq '.mcpServers // empty' "$REPO_SETTINGS" 2>/dev/null)
        if [[ -n "$MCP_SERVERS" && "$MCP_SERVERS" != "null" ]]; then
            # Create temp file with merged content
            TEMP_SETTINGS=$(mktemp)
            jq --argjson mcp "$MCP_SERVERS" '.mcpServers = $mcp' "$ACTIVE_SETTINGS" > "$TEMP_SETTINGS" 2>/dev/null
            if [[ $? -eq 0 && -s "$TEMP_SETTINGS" ]]; then
                mv "$TEMP_SETTINGS" "$ACTIVE_SETTINGS"
                $VERBOSE && echo "Merged mcpServers into ~/.claude/settings.json" || true
            else
                rm -f "$TEMP_SETTINGS"
                $VERBOSE && echo "Warning: Failed to merge mcpServers" || true
            fi
        fi
    fi
elif ! $DRY_RUN; then
    $VERBOSE && echo "Note: jq not installed, skipping mcpServers merge" || true
fi

# Verification: compare file counts between source and target
if ! $DRY_RUN; then
    VERIFY_FAIL=0
    echo "Verification:"

    verify_dir() {
        local label="$1" src_dir="$2" dst_dir="$3" pattern="$4"
        if [[ ! -d "$src_dir" ]]; then
            return 0
        fi
        if [[ ! -d "$dst_dir" ]]; then
            echo "  $label: SKIPPED (target dir absent)"
            return 0
        fi
        local src_count dst_count
        if [[ -n "$pattern" ]]; then
            src_count=$(find "$src_dir" -maxdepth 1 -name "$pattern" -type f 2>/dev/null | wc -l)
            dst_count=$(find "$dst_dir" -maxdepth 1 -name "$pattern" -type f 2>/dev/null | wc -l)
        else
            src_count=$(find "$src_dir" -type f ! -name "*.pid" ! -name "*.lock" ! -path "*/.tldr/*" ! -path "*/node_modules/*" ! -path "*/cache/*" ! -path "*/dist/*" 2>/dev/null | wc -l)
            dst_count=$(find "$dst_dir" -type f ! -name "*.pid" ! -name "*.lock" ! -path "*/.tldr/*" ! -path "*/node_modules/*" ! -path "*/cache/*" ! -path "*/dist/*" 2>/dev/null | wc -l)
        fi
        src_count=$(echo "$src_count" | tr -d ' ')
        dst_count=$(echo "$dst_count" | tr -d ' ')
        if [[ "$src_count" -eq "$dst_count" ]]; then
            echo "  $label: OK ($src_count files)"
        else
            echo "  $label: MISMATCH (source=$src_count, target=$dst_count)"
            VERIFY_FAIL=1
        fi
    }

    for dir in $SYNC_DIRS; do
        verify_dir "$dir" "$REPO_CLAUDE/$dir" "$ACTIVE_CLAUDE/$dir"
    done
    verify_dir "hooks/dist (*.mjs)" "$REPO_CLAUDE/hooks/dist" "$ACTIVE_CLAUDE/hooks/dist" "*.mjs"
    verify_dir "scripts/ralph (*.py)" "$REPO_CLAUDE/scripts/ralph" "$ACTIVE_CLAUDE/scripts/ralph" "*.py"
    verify_dir "templates/ralph" "$REPO_CLAUDE/templates/ralph" "$ACTIVE_CLAUDE/templates/ralph"

    if [[ "$VERIFY_FAIL" -eq 1 ]]; then
        echo "  WARNING: Some directories have file count mismatches"
    fi
fi

$VERBOSE && echo "Sync complete: continuous-claude -> ~/.claude" || true
