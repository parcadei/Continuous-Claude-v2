#!/usr/bin/env bash
# Sync script for Continuous Claude
# Syncs shareable files between ~/.claude and continuous-claude/.claude

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
REPO_CLAUDE="$REPO_ROOT/.claude"
USER_CLAUDE="$HOME/.claude"

# Parse args
DIRECTION="to-repo"
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --to-repo) DIRECTION="to-repo"; shift ;;
        --from-repo) DIRECTION="from-repo"; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --help|-h)
            echo "Usage: $0 [--to-repo|--from-repo] [--dry-run] [--verbose]"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Set source and destination
if [[ "$DIRECTION" == "to-repo" ]]; then
    SRC="$USER_CLAUDE"
    DST="$REPO_CLAUDE"
else
    SRC="$REPO_CLAUDE"
    DST="$USER_CLAUDE"
fi

$VERBOSE && echo "Syncing: $SRC -> $DST"

# Directories to sync
SYNC_DIRS="hooks/src rules agents skills scripts docs"

# Files/patterns to never sync
NEVER_SYNC="CLAUDE.md RULES.md .env .credentials.json settings.json history.jsonl knowledge-tree.json"

# Copy function
copy_dir() {
    local dir="$1"
    local src_path="$SRC/$dir"
    local dst_path="$DST/$dir"

    [[ ! -d "$src_path" ]] && return 0

    $DRY_RUN || mkdir -p "$dst_path"

    # Use cp -r with exclusions simulated via find
    find "$src_path" -type f ! -name "*.pid" ! -name "*.lock" ! -path "*/.tldr/*" ! -path "*/node_modules/*" ! -path "*/cache/*" 2>/dev/null | while IFS= read -r src_file; do
        local rel="${src_file#$src_path/}"
        local dst_file="$dst_path/$rel"

        # Skip never-sync files
        local base=$(basename "$src_file")
        for skip in $NEVER_SYNC; do
            [[ "$base" == "$skip" ]] && continue 2
        done

        if $DRY_RUN; then
            echo "Would copy: $dir/$rel"
        else
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: $dir/$rel"
        fi
    done
}

# Sync each directory
for dir in $SYNC_DIRS; do
    copy_dir "$dir"
done

# Copy specific hook files
for pattern in "hooks/*.sh" "hooks/*.py" "hooks/*.mjs" "hooks/*.ps1" "hooks/package.json" "hooks/tsconfig.json"; do
    for src_file in $SRC/$pattern; do
        [[ ! -f "$src_file" ]] && continue
        rel="${src_file#$SRC/}"
        dst_file="$DST/$rel"

        if $DRY_RUN; then
            echo "Would copy: $rel"
        else
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            $VERBOSE && echo "Copied: $rel"
        fi
    done
done

$VERBOSE && echo "Sync complete"
