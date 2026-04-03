#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Session start hook: Warm tldr cache and build semantic index
Cross-platform Python port of session-symbol-index.sh

Uses daemon for cache warming (P0-P4)
Triggers semantic indexing (P5) if call graph exists but FAISS missing
"""
import os
import json
import subprocess
from pathlib import Path

def main():
    project_dir = Path(os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd()))
    cache_dir = project_dir / '.claude' / 'cache' / 'tldr'
    semantic_dir = cache_dir / 'semantic'

    calls_file = cache_dir / 'calls.json'
    faiss_file = semantic_dir / 'index.faiss'

    # Check if call graph exists
    if not calls_file.exists():
        # Trigger warm via daemon (non-blocking)
        try:
            subprocess.Popen(
                ['tldr', 'daemon', 'warm', str(project_dir)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True  # Detach from parent (cross-platform nohup)
            )
            print(json.dumps({'status': 'tldr_warming'}))
        except Exception:
            print(json.dumps({'status': 'tldr_warm_failed'}))
        return

    # Call graph exists - check if semantic index needed
    if calls_file.exists() and not faiss_file.exists():
        try:
            log_file = cache_dir / 'semantic_indexing.log'
            with open(log_file, 'w') as log:
                subprocess.Popen(
                    ['tldr', 'daemon', 'semantic', 'index', str(project_dir)],
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    start_new_session=True
                )
            print(json.dumps({'status': 'tldr_semantic_indexing'}))
        except Exception:
            print(json.dumps({'status': 'tldr_semantic_failed'}))
        return

    # Everything ready
    print(json.dumps({'status': 'tldr_ready'}))

if __name__ == '__main__':
    main()
