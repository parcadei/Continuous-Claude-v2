---
name: wiring
description: Wiring Verification
user-invocable: false
---

# Wiring Verification

When building infrastructure components, ensure they're actually invoked in the execution path.

## Pattern

Every module needs a clear entry point. Dead code is worse than no code - it creates maintenance burden and false confidence.

## The Four-Step Wiring Check

Before marking infrastructure "done", verify:

1. **Entry Point Exists**: How does user action trigger this code?
2. **Call Graph Traced**: Can you follow the path from entry to execution?
3. **Integration Tested**: Does an end-to-end test exercise this path?
4. **No Dead Code**: Is every built component actually reachable?

## DO

### Verify Entry Points

```bash
# Hook registered?
grep -r "orchestration" .claude/settings.json

# Skill activated?
grep -r "skill-name" .claude/skill-rules.json

# Script executable?
ls -la scripts/orchestrate.py

# Module imported?
grep -r "from orchestration_layer import" .
```

### Trace Call Graphs

```python
# Entry point (hook)
.claude/hooks/pre-tool-use.sh
  ↓
# Shell wrapper calls TypeScript
npx tsx pre-tool-use.ts
  ↓
# TypeScript calls Python script
spawn('scripts/orchestrate.py')
  ↓
# Script imports module
from orchestration_layer import dispatch
  ↓
# Module executes
dispatch(agent_type, task)
```

### Test End-to-End

```bash
# Don't just unit test the module
pytest tests/unit/orchestration_layer_test.py  # NOT ENOUGH

# Test the full invocation path
echo '{"tool": "Task"}' | .claude/hooks/pre-tool-use.sh  # VERIFY THIS WORKS
```

### Document Wiring

```markdown
## Wiring

- **Entry Point**: PreToolUse hook on Task tool
- **Registration**: `.claude/settings.json` line 45
- **Call Path**: hook → pre-tool-use.ts → scripts/orchestrate.py → orchestration_layer.py
- **Test**: `tests/integration/task_orchestration_test.py`
```

## DON'T

### Build Without Wiring

```python
# BAD: Created orchestration_layer.py with 500 lines
# But nothing imports it or calls it
# Result: Dead code, wasted effort

# GOOD: Start with minimal wiring, then expand
# 1. Create hook (10 lines)
# 2. Test hook fires
# 3. Add script (20 lines)
# 4. Test script executes
# 5. Add module logic (iterate)
```

### Create Parallel Routing

```python
# BAD: Agent router has dispatch logic
# AND skill-rules.json has agent selection logic
# AND hooks have agent filtering logic
# Result: Three places to update, routing conflicts

# GOOD: Single source of truth for routing
# skill-rules.json activates skill → skill calls router → router dispatches
```

### Assume Imports Work

```python
# BAD: Assume because you wrote the code, it's imported
from orchestration_layer import dispatch  # Does this path exist?

# GOOD: Verify imports at integration test time
uv run python -c "from orchestration_layer import dispatch; print('OK')"
```

### Skip Integration Tests

```bash
# BAD: Only unit test
pytest tests/unit/  # All pass, but nothing works end-to-end

# GOOD: Integration test the wiring
pytest tests/integration/  # Verify full call path
```

## Common Wiring Gaps

### Hook Not Registered

```json
// .claude/settings.json - hook definition exists but not in hooks section
{
  "hooks": {
    "PreToolUse": []  // Empty! Your hook never fires
  }
}
```

**Fix**: Add hook registration:
```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": ["Task"],
      "hooks": [{
        "type": "command",
        "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/orchestration.sh"
      }]
    }]
  }
}
```

### Script Not Executable

```bash
# Script exists but can't execute
-rw-r--r-- scripts/orchestrate.py

# Fix: Make executable
chmod +x scripts/orchestrate.py
```

### Module Not Importable

```python
# Script tries to import but path is wrong
from orchestration_layer import dispatch
# ModuleNotFoundError

# Fix: Add to Python path or use proper package structure
sys.path.insert(0, str(Path(__file__).parent.parent))
```

### Router Has No Dispatch Path

```python
# BAD: Router has beautiful mapping
AGENT_MAP = {
    "implement": ImplementAgent,
    "research": ResearchAgent,
    # ... 18 agent types
}

# But no dispatch function uses the map
def route(task):
    return "general-purpose"  # Hardcoded! Map is dead code

# GOOD: Dispatch actually uses the map
def route(task):
    agent_type = classify(task)
    return AGENT_MAP[agent_type]
```

## Wiring Checklist

Before marking infrastructure "complete":

- [ ] Entry point identified and tested (hook/skill/CLI)
- [ ] Call graph documented (entry → module execution)
- [ ] Integration test exercises full path
- [ ] No orphaned modules (everything imported/called)
- [ ] Registration complete (settings.json/skill-rules.json)
- [ ] Permissions correct (scripts executable)
- [ ] Import paths verified (manual import test passes)

## Real-World Examples

### Example 1: DAG Orchestration (This Session)

**What was built:**
- `opc/orchestration/orchestration_layer.py` (500+ lines)
- `opc/orchestration/dag/` (DAG builder, validator, executor)
- 18 agent type definitions
- Sophisticated routing logic

**Wiring gap:**
- No hook calls orchestration_layer.py
- No script imports the DAG modules
- Agent routing returns hardcoded "general-purpose"
- Result: 100% dead code

**Fix:**
1. Create PreToolUse hook for Task tool
2. Hook calls `scripts/orchestrate.py`
3. Script imports and calls `orchestration_layer.dispatch()`
4. Dispatch uses AGENT_MAP to route to actual agents
5. Integration test: Submit Task → verify correct agent type used

### Example 2: Artifact Index (Previous Session)

**What was built:**
- SQLite database schema
- Indexing logic
- Query functions

**Wiring gap:**
- No hook triggered indexing
- Files created but never indexed

**Fix:**
1. PostToolUse hook on Write tool
2. Hook calls indexing script immediately
3. Integration test: Write file → verify indexed

## Detection Strategy

### Grep for Orphans

```bash
# Find Python modules
find . -name "*.py" -type f

# Check if each is imported
for file in $(find . -name "*.py"); do
  module=$(basename $file .py)
  grep -r "from.*$module import\|import.*$module" . || echo "ORPHAN: $file"
done
```

### Check Hook Registration

```bash
# List all hooks in .claude/hooks/
ls .claude/hooks/*.sh

# Check each is registered
for hook in $(ls .claude/hooks/*.sh); do
  basename_hook=$(basename $hook)
  grep -q "$basename_hook" .claude/settings.json || echo "UNREGISTERED: $hook"
done
```

### Verify Script Execution

```bash
# Find all Python scripts
find scripts/ -name "*.py"

# Test each can be imported
for script in $(find scripts/ -name "*.py"); do
  uv run python -c "import sys; sys.path.insert(0, 'scripts'); import $(basename $script .py)" 2>/dev/null || echo "IMPORT FAIL: $script"
done
```

## Source

- This session: DAG orchestration wiring gap - 500+ lines of dead code discovered
- Previous sessions: Artifact Index, LMStudio integration - wiring added after initial build
