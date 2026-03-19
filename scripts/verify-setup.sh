#!/usr/bin/env bash
# Continuous Claude - Setup Verification
# Run after wizard to verify everything is working

PASS=0
FAIL=0
WARN=0

check() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "  [PASS] $name"
        ((PASS++))
    else
        echo "  [FAIL] $name"
        ((FAIL++))
    fi
}

warn_check() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "  [PASS] $name"
        ((PASS++))
    else
        echo "  [WARN] $name"
        ((WARN++))
    fi
}

echo "=== Continuous Claude Setup Verification ==="
echo ""

echo "1. Prerequisites"
check "Docker installed" "docker --version"
check "Node.js installed" "node --version"
check "Python installed" "python --version || python3 --version"
check "uv installed" "uv --version"
check "Git installed" "git --version"

echo ""
echo "2. Docker Services"
check "Docker daemon running" "docker info"
check "PostgreSQL container running" "docker ps | grep continuous-claude-postgres"

echo ""
echo "3. Claude Code Configuration"
check "~/.claude directory exists" "test -d $HOME/.claude"
check "settings.json exists" "test -f $HOME/.claude/settings.json"
check "settings.json has no foreign paths" "! grep -qi 'david.hayes' $HOME/.claude/settings.json 2>/dev/null || whoami | grep -qi 'david.hayes'"
check "CLAUDE.md exists" "test -f $HOME/.claude/CLAUDE.md"
check "RULES.md exists" "test -f $HOME/.claude/RULES.md"

echo ""
echo "4. Hooks"
check "hooks/dist directory exists" "test -d $HOME/.claude/hooks/dist"
check "Hook bundles present (90+)" "test $(ls $HOME/.claude/hooks/dist/*.mjs 2>/dev/null | wc -l) -ge 90"
check "node_modules installed" "test -d $HOME/.claude/hooks/node_modules"

echo ""
echo "5. Environment"
check "CLAUDE_OPC_DIR is set" "test -n \"\$CLAUDE_OPC_DIR\""
check "CLAUDE_OPC_DIR points to valid directory" "test -d \"\$CLAUDE_OPC_DIR\""
warn_check "PYTHONUTF8 is set (Windows)" "test -n '$PYTHONUTF8' || test $(uname -o 2>/dev/null) != 'Msys'"

echo ""
echo "6. Git Hooks"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
warn_check "Post-commit hook installed" "test -f '$REPO_ROOT/.git/hooks/post-commit'"

echo ""
echo "7. Python Dependencies"
warn_check "opc venv exists" "test -d '$CLAUDE_OPC_DIR/../.venv' || test -d '$CLAUDE_OPC_DIR/.venv'"

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Warnings: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "Setup looks good!"
    exit 0
else
    echo "$FAIL check(s) failed. Review above and fix."
    exit 1
fi
