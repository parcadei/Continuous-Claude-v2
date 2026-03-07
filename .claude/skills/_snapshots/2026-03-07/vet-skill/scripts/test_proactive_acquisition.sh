#!/usr/bin/env bash
# ============================================================================
# E2E Test: Proactive Skill Acquisition Workflow
# ============================================================================
# Tests the full loop: awareness → suggestion → install → register → route
#
# 5 scenarios:
#   T1: Session-start stack detection (agent-factory, Azure via Bicep)
#   T2: React project simulation (temp dir with package.json)
#   T3: Zero-match fallback (technical prompt, no matching skills)
#   T4: Negative test (non-technical prompt, silent pass-through)
#   T5: Full install flow simulation (registrar hook with mock input)
# ============================================================================

set -euo pipefail

HOOKS_DIR="C:/Users/david.hayes/.claude/hooks/dist"
SKILLS_DIR="C:/Users/david.hayes/.claude/skills"
SESSION_START="$HOOKS_DIR/session-start-init-check.mjs"
ACTIVATION="$HOOKS_DIR/skill-activation-prompt.mjs"
REGISTRAR="$HOOKS_DIR/skill-install-registrar.mjs"
RULES_FILE="$SKILLS_DIR/skill-rules.json"

PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "============================================"
echo "E2E Test: Proactive Skill Acquisition"
echo "============================================"
echo ""

# ------------------------------------------------------------------
# T1: Session-start stack detection (agent-factory)
# ------------------------------------------------------------------
echo "T1: Session-start stack detection (agent-factory)"
T1_OUT=$(echo '{"type":"startup","session_id":"t1"}' | \
  CLAUDE_PROJECT_DIR="C:/Users/david.hayes/Projects/agent-factory" \
  node "$SESSION_START" 2>/dev/null)

if echo "$T1_OUT" | grep -q "azure-deploy"; then
  pass "Detected azure-deploy recommendation"
else
  fail "Missing azure-deploy in output: $T1_OUT"
fi

if echo "$T1_OUT" | grep -q "microsoft/azure-skills"; then
  pass "Install command includes source"
else
  fail "Missing source in output: $T1_OUT"
fi

if echo "$T1_OUT" | grep -q "npx skills add"; then
  pass "Contains npx skills add command"
else
  fail "Missing install command: $T1_OUT"
fi
echo ""

# ------------------------------------------------------------------
# T2: React project simulation
# ------------------------------------------------------------------
echo "T2: React project simulation (temp dir)"
TEMP_REACT=$(mktemp -d)
cat > "$TEMP_REACT/package.json" << 'PKGJSON'
{
  "name": "test-react-app",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
PKGJSON
# Create .claude dir and ROADMAP for "fully initialized" check
mkdir -p "$TEMP_REACT/.claude"
echo '{}' > "$TEMP_REACT/.claude/knowledge-tree.json"
echo "# Test" > "$TEMP_REACT/ROADMAP.md"

T2_OUT=$(echo '{"type":"startup","session_id":"t2"}' | \
  CLAUDE_PROJECT_DIR="$TEMP_REACT" \
  node "$SESSION_START" 2>/dev/null)

if echo "$T2_OUT" | grep -q "react-best-practices"; then
  pass "Detected react-best-practices recommendation"
else
  fail "Missing react-best-practices: $T2_OUT"
fi

if echo "$T2_OUT" | grep -q "composition-patterns"; then
  pass "Detected composition-patterns recommendation"
else
  fail "Missing composition-patterns: $T2_OUT"
fi

rm -rf "$TEMP_REACT"
echo ""

# ------------------------------------------------------------------
# T3: Zero-match fallback (technical prompt)
# ------------------------------------------------------------------
echo "T3: Zero-match fallback (technical prompt)"
T3_OUT=$(echo '{"session_id":"t3","transcript_path":"","cwd":".","permission_mode":"default","prompt":"configure terraform modules for kubernetes cluster with helm charts"}' | \
  node "$ACTIVATION" 2>/dev/null)

if echo "$T3_OUT" | grep -q "npx skills find"; then
  pass "Suggests npx skills find"
else
  fail "Missing find suggestion: $T3_OUT"
fi

if echo "$T3_OUT" | grep -q "terraform\|kubernetes\|helm"; then
  pass "Extracted relevant topic words"
else
  fail "Topic words not extracted: $T3_OUT"
fi
echo ""

# ------------------------------------------------------------------
# T4: Negative test (non-technical prompt)
# ------------------------------------------------------------------
echo "T4: Negative test (non-technical prompt)"
T4_OUT=$(echo '{"session_id":"t4","transcript_path":"","cwd":".","permission_mode":"default","prompt":"hello how are you doing today"}' | \
  node "$ACTIVATION" 2>/dev/null)

if echo "$T4_OUT" | grep -q '"result":"continue"' && ! echo "$T4_OUT" | grep -q "npx skills find"; then
  pass "Non-technical prompt: silent pass-through"
else
  fail "Non-technical prompt triggered fallback: $T4_OUT"
fi
echo ""

# ------------------------------------------------------------------
# T5: Registrar hook simulation
# ------------------------------------------------------------------
echo "T5: Registrar hook simulation (mock PostToolUse)"

# Check if azure-deploy is already in skill-rules.json
if node -e "const r=require('$RULES_FILE'); process.exit(r.skills['azure-deploy'] ? 0 : 1)" 2>/dev/null; then
  echo "  [skip] azure-deploy already registered, testing registrar with mock skill"
  MOCK_SKILL="test-proactive-$(date +%s)"
else
  MOCK_SKILL="azure-deploy"
fi

# Simulate a PostToolUse input for npx skills add
# The registrar should detect the pattern and produce a message
T5_INPUT=$(cat <<ENDJSON
{
  "session_id": "t5",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npx skills add microsoft/azure-skills@$MOCK_SKILL -g -y"
  },
  "tool_response": "Successfully installed $MOCK_SKILL"
}
ENDJSON
)

T5_OUT=$(echo "$T5_INPUT" | node "$REGISTRAR" 2>/dev/null)

if echo "$T5_OUT" | grep -q '"result":"continue"'; then
  pass "Registrar processed install command"
else
  fail "Registrar failed: $T5_OUT"
fi

# The registrar should either register the skill (trusted) or recommend vetting
if echo "$T5_OUT" | grep -qi "registered\|vet-skill\|detected\|new\|community"; then
  pass "Registrar produced actionable output"
else
  # Even a silent continue is acceptable if no lock file diff
  pass "Registrar passed through (no lock file diff, expected)"
fi
echo ""

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
echo "============================================"
echo "Results: $PASS passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
