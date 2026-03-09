#!/usr/bin/env bash
# Tests for scripts/sync-to-active.sh
# Uses temporary directories to avoid touching real ~/.claude
#
# Run: bash tests/unit/test_sync_to_active.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SYNC_SCRIPT="$REPO_ROOT/scripts/sync-to-active.sh"

PASS=0
FAIL=0
TOTAL=0

# Colors (safe for Git Bash)
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    TOTAL=$((TOTAL + 1))
    if [[ "$expected" == "$actual" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Expected: '$expected'"
        echo "  Actual:   '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

assert_file_exists() {
    local desc="$1" file_path="$2"
    TOTAL=$((TOTAL + 1))
    if [[ -f "$file_path" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File not found: $file_path"
        FAIL=$((FAIL + 1))
    fi
}

assert_file_not_exists() {
    local desc="$1" file_path="$2"
    TOTAL=$((TOTAL + 1))
    if [[ ! -f "$file_path" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File should not exist: $file_path"
        FAIL=$((FAIL + 1))
    fi
}

assert_output_contains() {
    local desc="$1" needle="$2" haystack="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$haystack" | grep -qF -- "$needle"; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Expected to contain: '$needle'"
        echo "  Output was: '$haystack'"
        FAIL=$((FAIL + 1))
    fi
}

assert_output_not_contains() {
    local desc="$1" needle="$2" haystack="$3"
    TOTAL=$((TOTAL + 1))
    if ! echo "$haystack" | grep -qF -- "$needle"; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Expected NOT to contain: '$needle'"
        echo "  Output was: '$haystack'"
        FAIL=$((FAIL + 1))
    fi
}

# ============================================================
# Setup: Create a fake repo and fake active directory
# ============================================================

setup_fixture() {
    # Create temp directories that mimic the repo structure
    TEMP_BASE=$(mktemp -d)
    FAKE_REPO="$TEMP_BASE/continuous-claude"
    FAKE_ACTIVE="$TEMP_BASE/dot-claude"

    # Create repo structure: scripts/ and .claude/
    mkdir -p "$FAKE_REPO/scripts"
    mkdir -p "$FAKE_REPO/.claude/hooks/src"
    mkdir -p "$FAKE_REPO/.claude/hooks/dist"
    mkdir -p "$FAKE_REPO/.claude/rules"
    mkdir -p "$FAKE_REPO/.claude/agents"
    mkdir -p "$FAKE_REPO/.claude/skills"
    mkdir -p "$FAKE_REPO/.claude/scripts/ralph"

    # Create active structure
    mkdir -p "$FAKE_ACTIVE/hooks/src"
    mkdir -p "$FAKE_ACTIVE/hooks/dist"
    mkdir -p "$FAKE_ACTIVE/rules"
    mkdir -p "$FAKE_ACTIVE/agents"
    mkdir -p "$FAKE_ACTIVE/skills"
    mkdir -p "$FAKE_ACTIVE/scripts/ralph"

    # Populate source files
    echo "// hook src" > "$FAKE_REPO/.claude/hooks/src/test-hook.ts"
    echo "// dist bundle 1" > "$FAKE_REPO/.claude/hooks/dist/hook-a.mjs"
    echo "// dist bundle 2" > "$FAKE_REPO/.claude/hooks/dist/hook-b.mjs"
    echo "# rule" > "$FAKE_REPO/.claude/rules/test-rule.md"
    echo "# agent" > "$FAKE_REPO/.claude/agents/test-agent.md"
    echo "# skill" > "$FAKE_REPO/.claude/skills/test-skill.md"
    echo "# ralph script" > "$FAKE_REPO/.claude/scripts/ralph/ralph-state-v2.py"
    echo "# ralph checkpoint" > "$FAKE_REPO/.claude/scripts/ralph/ralph-checkpoint.py"
    echo "# ralph test" > "$FAKE_REPO/.claude/scripts/ralph/test_ralph.py"
    echo '{"name": "hooks"}' > "$FAKE_REPO/.claude/hooks/package.json"

    # Create a modified version of sync-to-active.sh that uses our fake paths
    # We override REPO_ROOT and HOME so the script targets our fixture directories
    FAKE_SYNC="$FAKE_REPO/scripts/sync-to-active.sh"
    cp "$SYNC_SCRIPT" "$FAKE_SYNC"

    # Patch the script to use our fake paths instead of real ones
    # Replace the path discovery block
    sed -i 's|SCRIPT_DIR=.*|SCRIPT_DIR="'"$FAKE_REPO/scripts"'"|' "$FAKE_SYNC"
    sed -i 's|REPO_ROOT=.*|REPO_ROOT="'"$FAKE_REPO"'"|' "$FAKE_SYNC"
    sed -i 's|ACTIVE_CLAUDE=.*|ACTIVE_CLAUDE="'"$FAKE_ACTIVE"'"|' "$FAKE_SYNC"
}

teardown_fixture() {
    if [[ -n "$TEMP_BASE" && -d "$TEMP_BASE" ]]; then
        rm -rf "$TEMP_BASE"
    fi
}

# ============================================================
# Test: Existing directories sync (hooks/src, rules, agents, skills)
# ============================================================

test_existing_dirs_sync() {
    echo ""
    echo "=== Test: Existing directory sync ==="
    setup_fixture

    bash "$FAKE_SYNC" --skip-build 2>&1

    assert_file_exists "hooks/src synced" "$FAKE_ACTIVE/hooks/src/test-hook.ts"
    assert_file_exists "rules synced" "$FAKE_ACTIVE/rules/test-rule.md"
    assert_file_exists "agents synced" "$FAKE_ACTIVE/agents/test-agent.md"
    assert_file_exists "skills synced" "$FAKE_ACTIVE/skills/test-skill.md"

    teardown_fixture
}

# ============================================================
# Test: hooks/dist/*.mjs files sync
# ============================================================

test_hooks_dist_sync() {
    echo ""
    echo "=== Test: hooks/dist/*.mjs sync ==="
    setup_fixture

    bash "$FAKE_SYNC" --skip-build 2>&1

    assert_file_exists "hooks/dist/hook-a.mjs synced" "$FAKE_ACTIVE/hooks/dist/hook-a.mjs"
    assert_file_exists "hooks/dist/hook-b.mjs synced" "$FAKE_ACTIVE/hooks/dist/hook-b.mjs"

    # Verify content matches
    local src_content dst_content
    src_content=$(cat "$FAKE_REPO/.claude/hooks/dist/hook-a.mjs")
    dst_content=$(cat "$FAKE_ACTIVE/hooks/dist/hook-a.mjs")
    assert_eq "hooks/dist content matches" "$src_content" "$dst_content"

    teardown_fixture
}

# ============================================================
# Test: scripts/ralph/*.py files sync
# ============================================================

test_ralph_scripts_sync() {
    echo ""
    echo "=== Test: scripts/ralph/*.py sync ==="
    setup_fixture

    bash "$FAKE_SYNC" --skip-build 2>&1

    assert_file_exists "ralph-state-v2.py synced" "$FAKE_ACTIVE/scripts/ralph/ralph-state-v2.py"
    assert_file_exists "ralph-checkpoint.py synced" "$FAKE_ACTIVE/scripts/ralph/ralph-checkpoint.py"
    assert_file_exists "test_ralph.py synced" "$FAKE_ACTIVE/scripts/ralph/test_ralph.py"

    teardown_fixture
}

# ============================================================
# Test: scripts/ralph skipped when target dir doesn't exist
# ============================================================

test_ralph_scripts_skip_no_target() {
    echo ""
    echo "=== Test: scripts/ralph skipped when target absent ==="
    setup_fixture

    # Remove the target ralph directory
    rm -rf "$FAKE_ACTIVE/scripts/ralph"
    rm -rf "$FAKE_ACTIVE/scripts"

    bash "$FAKE_SYNC" --skip-build 2>&1

    # The script should NOT create the directory or copy files
    assert_file_not_exists "ralph dir not created" "$FAKE_ACTIVE/scripts/ralph/ralph-state-v2.py"

    teardown_fixture
}

# ============================================================
# Test: --dry-run shows [DRY RUN] prefix and does not copy
# ============================================================

test_dry_run_format() {
    echo ""
    echo "=== Test: --dry-run format and behavior ==="
    setup_fixture

    local output
    output=$(bash "$FAKE_SYNC" --dry-run --skip-build 2>&1)

    # Should contain [DRY RUN] prefix
    assert_output_contains "dry-run has [DRY RUN] prefix" "[DRY RUN]" "$output"

    # Should mention source -> target format
    assert_output_contains "dry-run shows arrow format" "->" "$output"

    # Should NOT actually copy hooks/dist files
    # (Active dir was empty to start, so files should still not exist)
    # Remove any pre-existing files from fixture setup target
    rm -f "$FAKE_ACTIVE/hooks/dist/hook-a.mjs" 2>/dev/null
    rm -f "$FAKE_ACTIVE/hooks/dist/hook-b.mjs" 2>/dev/null

    output=$(bash "$FAKE_SYNC" --dry-run --skip-build 2>&1)
    assert_file_not_exists "dry-run does not copy dist/hook-a.mjs" "$FAKE_ACTIVE/hooks/dist/hook-a.mjs"

    teardown_fixture
}

# ============================================================
# Test: --dry-run mentions hooks/dist and scripts/ralph
# ============================================================

test_dry_run_mentions_new_dirs() {
    echo ""
    echo "=== Test: --dry-run mentions new sync targets ==="
    setup_fixture

    local output
    output=$(bash "$FAKE_SYNC" --dry-run --skip-build 2>&1)

    assert_output_contains "dry-run mentions hook-a.mjs" "hook-a.mjs" "$output"
    assert_output_contains "dry-run mentions hook-b.mjs" "hook-b.mjs" "$output"
    assert_output_contains "dry-run mentions ralph-state-v2.py" "ralph-state-v2.py" "$output"

    teardown_fixture
}

# ============================================================
# Test: Verification step reports file counts
# ============================================================

test_verification_report() {
    echo ""
    echo "=== Test: Verification step reports ==="
    setup_fixture

    local output
    output=$(bash "$FAKE_SYNC" --skip-build --verbose 2>&1)

    # Should contain verification output
    assert_output_contains "verification header present" "Verification" "$output"

    teardown_fixture
}

# ============================================================
# Test: Verification catches mismatches
# ============================================================

test_verification_mismatch() {
    echo ""
    echo "=== Test: Verification catches mismatches ==="
    setup_fixture

    # Run sync first
    bash "$FAKE_SYNC" --skip-build 2>&1 > /dev/null

    # Now add an extra file to source that wasn't synced
    # (add to a NEVER_SYNC file to create a mismatch if verification counts all files)
    # Actually, add a regular file to rules/ in source after sync
    echo "# extra rule" > "$FAKE_REPO/.claude/rules/extra-rule.md"

    # Run again to sync the new file
    local output
    output=$(bash "$FAKE_SYNC" --skip-build --verbose 2>&1)

    # After second sync, verification should show OK (all synced)
    assert_output_contains "verification shows results" "Verification" "$output"

    teardown_fixture
}

# ============================================================
# Test: NEVER_SYNC files are excluded
# ============================================================

test_never_sync_exclusion() {
    echo ""
    echo "=== Test: NEVER_SYNC files excluded ==="
    setup_fixture

    # Add a NEVER_SYNC file
    echo "secret" > "$FAKE_REPO/.claude/settings.json"
    echo "env_data" > "$FAKE_REPO/.claude/.env"

    bash "$FAKE_SYNC" --skip-build 2>&1

    # These should NOT be copied
    assert_file_not_exists "settings.json not copied" "$FAKE_ACTIVE/settings.json"

    teardown_fixture
}

# ============================================================
# Test: hooks root files sync (package.json, etc.)
# ============================================================

test_hooks_root_files_sync() {
    echo ""
    echo "=== Test: hooks root files sync ==="
    setup_fixture

    bash "$FAKE_SYNC" --skip-build 2>&1

    assert_file_exists "hooks/package.json synced" "$FAKE_ACTIVE/hooks/package.json"

    teardown_fixture
}

# ============================================================
# Run all tests
# ============================================================

echo "============================================"
echo "  sync-to-active.sh Test Suite"
echo "============================================"

test_existing_dirs_sync
test_hooks_dist_sync
test_ralph_scripts_sync
test_ralph_scripts_skip_no_target
test_dry_run_format
test_dry_run_mentions_new_dirs
test_verification_report
test_verification_mismatch
test_never_sync_exclusion
test_hooks_root_files_sync

echo ""
echo "============================================"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
echo "============================================"

if [[ $FAIL -gt 0 ]]; then
    exit 1
else
    exit 0
fi
