# Nia-First for External Documentation

Before using WebFetch or WebSearch for library docs, package source, or GitHub repos:

1. Check Nia indexed sources: `manage_resource(action='list', query='...')`
2. If indexed, use Nia tools (`search`, `doc_grep`, `code_grep`) instead
3. If not indexed but URL known, index it first with `index` tool

**Why**: Nia provides full, structured content. WebFetch returns truncated summaries.

For quick API lookups of popular packages, context7 is faster (pre-indexed).
For deep source code search, custom docs, or research papers, use Nia.
