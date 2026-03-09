#!/usr/bin/env bash
# Tests for .claude/skills/post-ship-audit/ skill
# Validates structure, format, content requirements, and audit steps
#
# Run: bash tests/unit/test_post_ship_audit_skill.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SKILL_DIR="$REPO_ROOT/.claude/skills/post-ship-audit"
SKILL_FILE="$SKILL_DIR/SKILL.md"
REFS_DIR="$SKILL_DIR/references"
CHECKLIST="$REFS_DIR/audit-checklist.md"

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

assert_not_contains() {
    local desc="$1" file="$2" pattern="$3"
    TOTAL=$((TOTAL + 1))
    if ! grep -qiE "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}PASS${NC}: $desc"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  Pattern unexpectedly found: $pattern"
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

assert_line_count_min() {
    local desc="$1" file="$2" min_lines="$3"
    TOTAL=$((TOTAL + 1))
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File not found: $file"
        FAIL=$((FAIL + 1))
        return
    fi
    local count
    count=$(wc -l < "$file" | tr -d ' ')
    if [[ "$count" -ge "$min_lines" ]]; then
        echo -e "${GREEN}PASS${NC}: $desc ($count lines)"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}FAIL${NC}: $desc"
        echo "  File has $count lines, min expected: $min_lines"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== Post-Ship Audit Skill Tests ==="
echo ""

# ==============================
# File Structure Tests
# ==============================
echo "--- File Structure ---"

assert_file_exists "SKILL.md exists" "$SKILL_FILE"
assert_dir_exists "references/ directory exists" "$REFS_DIR"
assert_file_exists "audit-checklist.md exists" "$CHECKLIST"

# ==============================
# SKILL.md Format Tests (v5 Hybrid)
# ==============================
echo ""
echo "--- SKILL.md Format (v5 Hybrid) ---"

# YAML frontmatter
assert_contains "Has YAML frontmatter opening" "$SKILL_FILE" "^---$"
assert_contains "Has name field" "$SKILL_FILE" "^name:"
assert_contains "Has description field" "$SKILL_FILE" "^description:"
assert_contains "Has allowed-tools field" "$SKILL_FILE" "^allowed-tools:"
assert_contains "Has keywords in metadata" "$SKILL_FILE" "keywords:"

# Line count
assert_line_count_under "SKILL.md under 404 lines" "$SKILL_FILE" 404
assert_line_count_min "SKILL.md has substantive content (50+ lines)" "$SKILL_FILE" 50

# ==============================
# Trigger Keywords
# ==============================
echo ""
echo "--- Trigger Keywords ---"

assert_contains "Trigger: post-ship" "$SKILL_FILE" "post-ship"
assert_contains "Trigger: audit" "$SKILL_FILE" "audit"
assert_contains "Trigger: verify ship" "$SKILL_FILE" "verify ship"
assert_contains "Trigger: post-ship audit" "$SKILL_FILE" "post-ship audit"

# ==============================
# 6-Step Audit Workflow
# ==============================
echo ""
echo "--- 6-Step Audit Workflow ---"

assert_contains "Step 1: Test suite" "$SKILL_FILE" "step 1.*test|test.*suite"
assert_contains "Step 2: Hook health" "$SKILL_FILE" "step 2.*hook|hook.*health"
assert_contains "Step 3: Sync drift" "$SKILL_FILE" "step 3.*sync|sync.*drift"
assert_contains "Step 4: Stale references" "$SKILL_FILE" "step 4.*stale|stale.*ref"
assert_contains "Step 5: ROADMAP" "$SKILL_FILE" "step 5.*roadmap|roadmap.*verif"
assert_contains "Step 6: Git state" "$SKILL_FILE" "step 6.*git|git.*state"

# Step 1 specifics: test suite
assert_contains "References npm test command" "$SKILL_FILE" "npm test"
assert_contains "References pytest command" "$SKILL_FILE" "pytest"

# Step 2 specifics: hook health
assert_contains "References hooks build" "$SKILL_FILE" "npm run build"
assert_contains "Checks dist files exist" "$SKILL_FILE" "dist.*exist|existsSync|MISSING"

# Step 3 specifics: sync drift
assert_contains "References sync-drift skill or logic" "$SKILL_FILE" "sync.drift|drift.check"

# Step 4 specifics: stale references
assert_contains "Mentions archived components" "$SKILL_FILE" "archiv|stale|sentinel|warden"
assert_contains "Searches CLAUDE.md or rules" "$SKILL_FILE" "CLAUDE\\.md|rules/"

# Step 5 specifics: ROADMAP
assert_contains "References ROADMAP.md" "$SKILL_FILE" "ROADMAP\\.md"
assert_contains "Checks feature status" "$SKILL_FILE" "complet|in.progress|status"

# Step 6 specifics: git state
assert_contains "References git status" "$SKILL_FILE" "git status"
assert_contains "Checks branches" "$SKILL_FILE" "git branch|branch"

# ==============================
# Output Format
# ==============================
echo ""
echo "--- Output Format ---"

assert_contains "Has report header format" "$SKILL_FILE" "Post-Ship Audit Report"
assert_contains "Shows Test Suite result" "$SKILL_FILE" "Test Suite.*PASS|1\\..*Test Suite"
assert_contains "Shows Hook Health result" "$SKILL_FILE" "Hook Health.*PASS|2\\..*Hook Health"
assert_contains "Shows Sync State result" "$SKILL_FILE" "Sync State.*PASS|3\\..*Sync"
assert_contains "Shows Stale Refs result" "$SKILL_FILE" "Stale Ref.*PASS|4\\..*Stale"
assert_contains "Shows ROADMAP result" "$SKILL_FILE" "ROADMAP.*PASS|5\\..*ROADMAP"
assert_contains "Shows Git State result" "$SKILL_FILE" "Git State.*PASS|6\\..*Git"
assert_contains "Has Overall result" "$SKILL_FILE" "Overall.*PASS|Overall.*FAIL"

# ==============================
# Bash Commands Present
# ==============================
echo ""
echo "--- Bash Commands ---"

assert_contains "Contains executable bash blocks" "$SKILL_FILE" '```bash'

# ==============================
# References: audit-checklist.md
# ==============================
echo ""
echo "--- audit-checklist.md ---"

assert_line_count_min "Checklist has substantive content (30+ lines)" "$CHECKLIST" 30

# All 6 steps documented
assert_contains "Checklist documents test suite step" "$CHECKLIST" "test suite"
assert_contains "Checklist documents hook health step" "$CHECKLIST" "hook health|hook.*check"
assert_contains "Checklist documents sync drift step" "$CHECKLIST" "sync.*drift|drift.*check"
assert_contains "Checklist documents stale references step" "$CHECKLIST" "stale.*ref"
assert_contains "Checklist documents ROADMAP step" "$CHECKLIST" "ROADMAP"
assert_contains "Checklist documents git state step" "$CHECKLIST" "git.*state|git.*status"

# Expected outcomes
assert_contains "Documents expected outcomes" "$CHECKLIST" "expect|pass.*crit|success"

# Remediation commands
assert_contains "Has remediation commands" "$CHECKLIST" "fix|remediat|resolv|run"

# ==============================
# Summary
# ==============================
echo ""
echo "==========================="
echo "Total: $TOTAL"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo "==========================="

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
