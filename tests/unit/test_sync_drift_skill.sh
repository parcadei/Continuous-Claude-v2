#!/usr/bin/env bash
# Tests for .claude/skills/sync-drift/ skill
# Validates structure, format, and content requirements
#
# Run: bash tests/unit/test_sync_drift_skill.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SKILL_DIR="$REPO_ROOT/.claude/skills/sync-drift"
SKILL_FILE="$SKILL_DIR/SKILL.md"
REFS_DIR="$SKILL_DIR/references"
DRIFT_CATS="$REFS_DIR/drift-categories.md"

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

assert_dir_exists() {
    local desc="$1" dir_path="$2"
    TOTAL=$((TOTAL + 1))
    if [[ -d "$dir_path" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Directory not found: $dir_path"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local desc="$1" file="$2" pattern="$3"
    TOTAL=$((TOTAL + 1))
    if grep -qiE "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Pattern not found: $pattern"
        echo "  In file: $file"
        FAIL=$((FAIL + 1))
    fi
}

assert_line_count_under() {
    local desc="$1" file="$2" max_lines="$3"
    TOTAL=$((TOTAL + 1))
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File not found: $file"
        FAIL=$((FAIL + 1))
        return
    fi
    local count
    count=$(wc -l < "$file" | tr -d ' ')
    if [[ "$count" -le "$max_lines" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc ($count lines)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File has $count lines, max allowed: $max_lines"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Sync Drift Skill Tests ==="
echo ""

# --- File Structure Tests ---
echo "--- File Structure ---"

assert_file_exists "SKILL.md exists" "$SKILL_FILE"
assert_dir_exists "references/ directory exists" "$REFS_DIR"
assert_file_exists "drift-categories.md exists" "$DRIFT_CATS"

# --- SKILL.md Format Tests ---
echo ""
echo "--- SKILL.md Format ---"

# v5 Hybrid frontmatter
assert_contains "Has YAML frontmatter opening" "$SKILL_FILE" "^---$"
assert_contains "Has name field" "$SKILL_FILE" "^name:"
assert_contains "Has description field" "$SKILL_FILE" "^description:"

# Line count under 404
assert_line_count_under "SKILL.md under 404 lines" "$SKILL_FILE" 404

# --- Trigger Keywords ---
echo ""
echo "--- Trigger Keywords ---"

assert_contains "Trigger: sync drift" "$SKILL_FILE" "sync drift"
assert_contains "Trigger: what's out of sync" "$SKILL_FILE" "what.*out of sync"
assert_contains "Trigger: check sync" "$SKILL_FILE" "check sync"
assert_contains "Trigger: drift check" "$SKILL_FILE" "drift check"

# --- Comparison Directories ---
echo ""
echo "--- Comparison Directories ---"

assert_contains "Compares hooks/src/" "$SKILL_FILE" "hooks/src"
assert_contains "Compares hooks/dist/" "$SKILL_FILE" "hooks/dist"
assert_contains "Compares rules/" "$SKILL_FILE" "rules/"
assert_contains "Compares skills/" "$SKILL_FILE" "skills/"
assert_contains "Compares agents/" "$SKILL_FILE" "agents/"

# --- Classification ---
echo ""
echo "--- Classification ---"

assert_contains "Mentions settings.json as local-only" "$SKILL_FILE" "settings\\.json"
assert_contains "Mentions CLAUDE.md as local-only" "$SKILL_FILE" "CLAUDE\\.md"
assert_contains "Mentions RULES.md as local-only" "$SKILL_FILE" "RULES\\.md"
assert_contains "Mentions knowledge-tree.json as local-only" "$SKILL_FILE" "knowledge-tree\\.json"

# --- Output Format ---
echo ""
echo "--- Output Format ---"

assert_contains "Has table output format" "$SKILL_FILE" "File.*path|Status|Fix"
assert_contains "Mentions sync-to-active.sh" "$SKILL_FILE" "sync-to-active"
assert_contains "Mentions npm run build" "$SKILL_FILE" "npm run build"

# --- Paths ---
echo ""
echo "--- Windows Paths ---"

assert_contains "Repo path defined" "$SKILL_FILE" "continuous-claude"
assert_contains "Active path reference" "$SKILL_FILE" "~/\\.claude|\\$HOME/\\.claude|C:/Users"

# --- Bash Commands ---
echo ""
echo "--- Bash Commands ---"

assert_contains "Uses diff command" "$SKILL_FILE" "diff"
assert_contains "Contains executable bash blocks" "$SKILL_FILE" '```bash'

# --- References: drift-categories.md ---
echo ""
echo "--- drift-categories.md ---"

assert_contains "Documents settings.json exclusion" "$DRIFT_CATS" "settings\\.json"
assert_contains "Documents settings.local.json exclusion" "$DRIFT_CATS" "settings\\.local\\.json"
assert_contains "Documents CLAUDE.md exclusion" "$DRIFT_CATS" "CLAUDE\\.md"
assert_contains "Documents RULES.md exclusion" "$DRIFT_CATS" "RULES\\.md"
assert_contains "Documents extraction-state.json exclusion" "$DRIFT_CATS" "extraction-state\\.json"
assert_contains "Documents knowledge-tree.json exclusion" "$DRIFT_CATS" "knowledge-tree\\.json"
assert_contains "Has explanation for why files are excluded" "$DRIFT_CATS" "machine.specific|local|per.machine|environment|override"

# --- Summary ---
echo ""
echo "==========================="
echo "Total: $TOTAL"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo "==========================="

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
