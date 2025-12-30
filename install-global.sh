#!/bin/bash
# Install Continuous Claude globally to ~/.claude/
# This enables all features in any project, not just this repo.
#
# Usage: ./install-global.sh
#
# This script is IDEMPOTENT and NON-DESTRUCTIVE:
#   - Tracks installed files via manifest (~/.claude/.continuous-claude-manifest.json)
#   - Only updates files originally installed by this script
#   - Preserves user-created skills, agents, rules, hooks
#   - Deep merges settings.json (preserves user permissions, statusLine, plugins)
#
# ✓ Safe to run multiple times - no backup needed after first install
# ✓ User customizations are preserved

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLOBAL_DIR="$HOME/.claude"
MANIFEST_FILE="$GLOBAL_DIR/.continuous-claude-manifest.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# --- Manifest Functions ---

MANIFEST_FILES=()

load_manifest() {
    if [ -f "$MANIFEST_FILE" ]; then
        # Load existing manifest files into array
        while IFS= read -r line; do
            MANIFEST_FILES+=("$line")
        done < <(jq -r '.files[]' "$MANIFEST_FILE" 2>/dev/null || true)
    fi
}

save_manifest() {
    local installed_at
    if [ -f "$MANIFEST_FILE" ]; then
        installed_at=$(jq -r '.installed_at' "$MANIFEST_FILE" 2>/dev/null || echo "$TIMESTAMP")
    else
        installed_at="$TIMESTAMP"
    fi

    # Build JSON array from MANIFEST_FILES (handle empty array)
    local files_json
    if [ ${#MANIFEST_FILES[@]} -eq 0 ]; then
        files_json="[]"
    else
        files_json=$(printf '%s\n' "${MANIFEST_FILES[@]}" | jq -R . | jq -s .)
    fi

    jq -n \
        --arg version "1.0.0" \
        --arg installed_at "$installed_at" \
        --arg updated_at "$TIMESTAMP" \
        --argjson files "$files_json" \
        '{version: $version, installed_at: $installed_at, updated_at: $updated_at, files: $files}' \
        > "$MANIFEST_FILE"
}

is_in_manifest() {
    local file="$1"
    [ ${#MANIFEST_FILES[@]} -eq 0 ] && return 1
    for f in "${MANIFEST_FILES[@]}"; do
        if [ "$f" = "$file" ]; then
            return 0
        fi
    done
    return 1
}

add_to_manifest() {
    local file="$1"
    if ! is_in_manifest "$file"; then
        MANIFEST_FILES+=("$file")
    fi
}

remove_from_manifest() {
    local file="$1"
    [ ${#MANIFEST_FILES[@]} -eq 0 ] && return
    local new_files=()
    for f in "${MANIFEST_FILES[@]}"; do
        if [ "$f" != "$file" ]; then
            new_files+=("$f")
        fi
    done
    MANIFEST_FILES=("${new_files[@]+"${new_files[@]}"}")
}

# --- Directory Sync Function ---

sync_directory() {
    local src_dir="$1"
    local dest_dir="$2"
    local prefix="$3"
    local exclude_pattern="${4:-}"

    mkdir -p "$dest_dir"

    # Sync files from source to destination
    if [ -d "$src_dir" ]; then
        while IFS= read -r -d '' src_file; do
            local rel_path="${src_file#$src_dir/}"

            # Skip excluded patterns
            if [ -n "$exclude_pattern" ]; then
                if [[ "$rel_path" =~ $exclude_pattern ]]; then
                    continue
                fi
            fi

            local manifest_path="$prefix/$rel_path"
            local dest_file="$dest_dir/$rel_path"

            # Create parent directory if needed
            mkdir -p "$(dirname "$dest_file")"

            if [ -e "$dest_file" ]; then
                if is_in_manifest "$manifest_path"; then
                    # We own this file - update it
                    cp "$src_file" "$dest_file"
                else
                    # User file with same name - skip
                    echo "  ⚠ Skipping $rel_path (user file exists)"
                fi
            else
                # New file - copy and track
                cp "$src_file" "$dest_file"
                add_to_manifest "$manifest_path"
            fi
        done < <(find "$src_dir" -type f -print0 2>/dev/null)
    fi

    # Clean up files we previously installed but are no longer in source
    if [ ${#MANIFEST_FILES[@]} -gt 0 ]; then
        local files_to_remove=()
        for manifest_path in "${MANIFEST_FILES[@]}"; do
            if [[ "$manifest_path" == "$prefix/"* ]]; then
                local rel_path="${manifest_path#$prefix/}"
                local src_file="$src_dir/$rel_path"
                local dest_file="$dest_dir/$rel_path"

                if [ ! -e "$src_file" ] && [ -e "$dest_file" ]; then
                    echo "  - Removing obsolete: $rel_path"
                    rm -f "$dest_file"
                    files_to_remove+=("$manifest_path")
                fi
            fi
        done

        # Remove from manifest
        for f in "${files_to_remove[@]+"${files_to_remove[@]}"}"; do
            remove_from_manifest "$f"
        done
    fi
}

# --- Settings Merge Function ---

merge_settings() {
    local repo_settings="$1"
    local user_settings="$2"

    if [ ! -f "$user_settings" ]; then
        # No user settings - just copy repo settings
        cp "$repo_settings" "$user_settings"
        return
    fi

    local merged
    merged=$(mktemp)

    # Deep merge with jq:
    # - User scalars win (statusLine, alwaysThinkingEnabled, etc.)
    # - Hooks arrays are concatenated and deduped by command
    # - Permissions.allow is unioned
    # - Objects are recursively merged
    jq -s '
        def dedupe_hooks:
            group_by(.hooks[0].command // .matcher // .) | map(.[0]);

        def merge_hook_arrays($user; $repo):
            if $user == null then $repo
            elif $repo == null then $user
            else ($user + $repo) | dedupe_hooks
            end;

        # Start with user settings as base
        .[0] as $user |
        .[1] as $repo |

        # Deep merge, user wins for scalars
        ($user // {}) * ($repo // {}) |

        # But restore user scalar preferences
        .statusLine = ($user.statusLine // .statusLine) |
        .alwaysThinkingEnabled = ($user.alwaysThinkingEnabled // .alwaysThinkingEnabled) |

        # Merge permissions.allow as union
        .permissions.allow = (($user.permissions.allow // []) + ($repo.permissions.allow // []) | unique) |

        # Merge enabledPlugins (user wins, add new from repo)
        .enabledPlugins = (($repo.enabledPlugins // {}) * ($user.enabledPlugins // {})) |

        # Merge each hook type
        .hooks.PreCompact = merge_hook_arrays($user.hooks.PreCompact; $repo.hooks.PreCompact) |
        .hooks.SessionStart = merge_hook_arrays($user.hooks.SessionStart; $repo.hooks.SessionStart) |
        .hooks.UserPromptSubmit = merge_hook_arrays($user.hooks.UserPromptSubmit; $repo.hooks.UserPromptSubmit) |
        .hooks.PostToolUse = merge_hook_arrays($user.hooks.PostToolUse; $repo.hooks.PostToolUse) |
        .hooks.Stop = merge_hook_arrays($user.hooks.Stop; $repo.hooks.Stop) |
        .hooks.SubagentStop = merge_hook_arrays($user.hooks.SubagentStop; $repo.hooks.SubagentStop) |
        .hooks.SessionEnd = merge_hook_arrays($user.hooks.SessionEnd; $repo.hooks.SessionEnd) |
        .hooks.Notification = merge_hook_arrays($user.hooks.Notification; $repo.hooks.Notification)
    ' "$user_settings" "$repo_settings" > "$merged"

    mv "$merged" "$user_settings"
}

echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  Continuous Claude - Global Installation                    │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""
echo "This will install to: $GLOBAL_DIR"
echo ""
echo "✓ IDEMPOTENT: Only updates files installed by this script"
echo "✓ SAFE: Your custom skills, agents, rules are preserved"
echo "✓ MERGES: settings.json deep-merged (your preferences kept)"
echo ""

# Check for jq (required for manifest and settings merge)
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is required for idempotent installation."
    echo "   Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

# Check for --yes flag to skip prompt
if [[ "${1:-}" != "--yes" && "${1:-}" != "-y" ]]; then
    read -p "Continue with installation? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

echo ""
echo "Installing Continuous Claude to $GLOBAL_DIR..."
echo ""

# Create global dir if needed
mkdir -p "$GLOBAL_DIR"

# Load existing manifest (or start fresh)
load_manifest
FIRST_INSTALL=false
if [ ${#MANIFEST_FILES[@]} -eq 0 ]; then
    FIRST_INSTALL=true
    echo "First installation detected - will track all installed files"
    echo ""
fi

# Install uv if not present (required for learnings hook)
if ! command -v uv &> /dev/null; then
    echo "Installing uv (Python package manager)..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Add to PATH for this session
    export PATH="$HOME/.local/bin:$PATH"
    echo "✓ uv installed"
    echo ""
fi

# Install qlty if not present (required for code quality checks)
if ! command -v qlty &> /dev/null && [ ! -f "$HOME/.qlty/bin/qlty" ]; then
    echo "Installing qlty (code quality toolkit)..."
    curl -fsSL https://qlty.sh/install.sh | bash
    # Add to PATH for this session
    export PATH="$HOME/.qlty/bin:$PATH"
    echo "✓ qlty installed"
    echo ""
elif command -v qlty &> /dev/null || [ -f "$HOME/.qlty/bin/qlty" ]; then
    echo "✓ qlty already installed"
    echo ""
fi

# Install MCP runtime package globally (makes mcp-exec, mcp-generate available everywhere)
echo "Installing MCP runtime package globally..."
cd "$SCRIPT_DIR"
uv tool install . --force --quiet 2>/dev/null || {
    echo "⚠️  Could not install MCP package globally. Run manually:"
    echo "   cd $SCRIPT_DIR && uv tool install . --force"
}
echo "✓ MCP commands installed: mcp-exec, mcp-generate, mcp-discover"
echo "  (available in ~/.local/bin/)"
echo ""

# Sync directories (idempotent - only updates repo-owned files)
echo "Syncing skills..."
sync_directory "$SCRIPT_DIR/.claude/skills" "$GLOBAL_DIR/skills" "skills"

echo "Syncing agents..."
sync_directory "$SCRIPT_DIR/.claude/agents" "$GLOBAL_DIR/agents" "agents"

echo "Syncing rules..."
sync_directory "$SCRIPT_DIR/.claude/rules" "$GLOBAL_DIR/rules" "rules"

echo "Syncing hooks..."
# Exclude src/, node_modules/, and .ts files (only dist needed for runtime)
sync_directory "$SCRIPT_DIR/.claude/hooks" "$GLOBAL_DIR/hooks" "hooks" "^(src/|node_modules/|.*\.ts$|package.*\.json$|tsconfig\.json$)"

echo "Syncing scripts..."
mkdir -p "$GLOBAL_DIR/scripts"

# Helper function to sync a single file
sync_file() {
    local src="$1"
    local dest="$2"
    local manifest_path="$3"

    if [ -e "$dest" ]; then
        if is_in_manifest "$manifest_path"; then
            cp "$src" "$dest"
        else
            echo "  ⚠ Skipping $(basename "$src") (user file exists)"
        fi
    else
        cp "$src" "$dest"
        add_to_manifest "$manifest_path"
    fi
}

# Sync shell scripts from .claude/scripts
for script in "$SCRIPT_DIR/.claude/scripts/"*.sh; do
    [ -f "$script" ] && sync_file "$script" "$GLOBAL_DIR/scripts/$(basename "$script")" "scripts/$(basename "$script")"
done

# Sync Python scripts from repo scripts/
for script in "$SCRIPT_DIR/scripts/"*.py; do
    [ -f "$script" ] && sync_file "$script" "$GLOBAL_DIR/scripts/$(basename "$script")" "scripts/$(basename "$script")"
done

# Sync other specific files
[ -f "$SCRIPT_DIR/scripts/artifact_schema.sql" ] && sync_file "$SCRIPT_DIR/scripts/artifact_schema.sql" "$GLOBAL_DIR/scripts/artifact_schema.sql" "scripts/artifact_schema.sql"
[ -f "$SCRIPT_DIR/init-project.sh" ] && sync_file "$SCRIPT_DIR/init-project.sh" "$GLOBAL_DIR/scripts/init-project.sh" "scripts/init-project.sh"

echo "Syncing MCP config..."
if [ -e "$GLOBAL_DIR/mcp_config.json" ]; then
    if is_in_manifest "mcp_config.json"; then
        cp "$SCRIPT_DIR/mcp_config.json" "$GLOBAL_DIR/mcp_config.json"
    else
        echo "  ⚠ Skipping mcp_config.json (user file exists)"
    fi
else
    cp "$SCRIPT_DIR/mcp_config.json" "$GLOBAL_DIR/mcp_config.json"
    add_to_manifest "mcp_config.json"
fi
echo "  → Global MCP servers available in all projects"
echo "  → Project configs override/extend global (config merging)"

echo "Syncing plugins..."
sync_directory "$SCRIPT_DIR/.claude/plugins/braintrust-tracing" "$GLOBAL_DIR/plugins/braintrust-tracing" "plugins/braintrust-tracing"

# Merge settings.json (preserves user preferences)
echo "Merging settings.json..."
merge_settings "$SCRIPT_DIR/.claude/settings.json" "$GLOBAL_DIR/settings.json"
echo "  → Your statusLine, permissions, plugins preserved"
echo "  → Repo hooks merged with your existing hooks"

# Create .env if it doesn't exist
if [ ! -f "$GLOBAL_DIR/.env" ]; then
    echo "Creating .env template..."
    cp "$SCRIPT_DIR/.env.example" "$GLOBAL_DIR/.env"
    echo ""
    echo "IMPORTANT: Edit ~/.claude/.env and add your API keys:"
    echo "  - BRAINTRUST_API_KEY (for session tracing)"
    echo "  - MORPH_API_KEY (for fast code search)"
    echo "  - etc."
else
    echo ".env already exists (not overwritten)"
fi

# Create required cache directories
mkdir -p "$GLOBAL_DIR/cache/learnings"
mkdir -p "$GLOBAL_DIR/cache/insights"
mkdir -p "$GLOBAL_DIR/cache/agents"
mkdir -p "$GLOBAL_DIR/cache/artifact-index"
mkdir -p "$GLOBAL_DIR/state/braintrust_sessions"

# Save manifest
save_manifest
echo ""
echo "Installation complete!"
echo "  → Manifest saved: $MANIFEST_FILE"
echo "  → ${#MANIFEST_FILES[@]} files tracked"
echo ""

echo "Features now available in any project:"
echo "  - MCP commands: mcp-exec, mcp-generate (from any directory)"
echo "  - Global MCP config: ~/.claude/mcp_config.json (merged with project)"
echo "  - Continuity ledger (/continuity_ledger)"
echo "  - Handoffs (/create_handoff, /resume_handoff)"
echo "  - TDD workflow (auto-activates on 'implement', 'fix bug')"
echo "  - Session tracing (if BRAINTRUST_API_KEY set)"
echo "  - All skills and agents"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "MCP SERVERS & API KEYS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The system uses these MCP servers (all optional - features degrade gracefully):"
echo ""
echo "  RepoPrompt     - Token-efficient codebase exploration (/rp-explorer, /onboard)"
echo "                   Get from: https://repoprompt.com"
echo "                   Enable MCP Server in the app settings"
echo ""
echo "  Braintrust     - Session tracing + auto-learnings"
echo "                   Get key: https://braintrust.dev"
echo ""
echo "  Morph          - Fast codebase search (/morph-search)"
echo "                   Get key: https://morphllm.com"
echo ""
echo "  Nia            - Library documentation (/nia-docs)"
echo "                   Get key: https://trynia.ai"
echo ""
echo "  GitHub         - GitHub code/issue search (/github-search)"
echo "                   Get key: https://github.com/settings/tokens"
echo ""
echo "  Exa            - Web search (built into Claude Code, no key needed)"
echo ""
echo "  Qlty           - Code quality checks (/qlty-check)"
echo "                   Auto-installed by this script (no API key needed)"
echo ""
echo "Add keys to: ~/.claude/.env"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "FOR EACH PROJECT - Initialize project structure:"
echo ""
echo "  cd /path/to/your/project"
echo "  ~/.claude/scripts/init-project.sh"
echo ""
echo "This creates thoughts/, .claude/cache/, and the Artifact Index"
echo "database so all hooks work immediately."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To update later, pull the repo and run this script again."
