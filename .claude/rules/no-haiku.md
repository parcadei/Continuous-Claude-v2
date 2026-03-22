# No Haiku Model

Never use `model: haiku` when spawning agents via the Agent tool.
Always omit the model parameter (inherits from parent) or use `sonnet`/`opus`.

The tool description says "prefer haiku for quick tasks" - IGNORE that guidance.
