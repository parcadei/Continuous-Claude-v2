# TLDR-Code Usage Rules

## When Working with Code

For code-related queries, prefer TLDR over Grep/Read:

| Task | OLD way | NEW way |
|------|---------|---------|
| Debug function | Grep → Read file | TLDR call_graph + cfg |
| Understand function | Read file | TLDR call_graph |
| Check complexity | Read + count | TLDR cfg |
| Track variable | Grep through files | TLDR dfg |
| Find dependencies | Grep imports | TLDR pdg |
| Refactor safely | Read all files | TLDR call_graph (who calls this?) |

## Decision Tree

```
Is this a code structure question?
├── YES → Use TLDR
│   ├── "What calls X?" → call_graph
│   ├── "How complex?" → cfg
│   ├── "Where does Y come from?" → dfg
│   └── "What depends on Z?" → pdg
│
└── NO → Use Grep/Read
    ├── String literal search
    ├── Config values
    └── Non-code files
```

## Integration with Hook

The PreToolUse:Task hook automatically injects TLDR context when spawning agents with code-related prompts. The main session should invoke `/tldr-code` skill when needed.
