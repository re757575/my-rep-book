#!/usr/bin/python3 -I
"""block-main-writes-in-worktrees.py 的案例測試。執行：`.claude/hooks/test_block_main_writes_in_worktrees.py`"""

import json
import subprocess
import sys
from pathlib import Path

HOOK = Path(__file__).with_name("block-main-writes-in-worktrees.py")
ROOT = "/repo"
WT = "/repo/.claude/worktrees/agent-x"

CASES = [
    # (預期, cwd, command)
    ("BLOCK", ROOT, f"git -C {WT} fetch . integration/mvp:main"),  # #5 subagent 實際下過的指令
    ("BLOCK", WT, "git push origin main"),  # #5 subagent 實際下過的指令
    ("BLOCK", WT, "git push origin HEAD:main"),
    ("BLOCK", WT, "git push --force origin +ticket/6:refs/heads/main"),
    ("BLOCK", WT, "git push --all origin"),
    ("BLOCK", WT, "git switch main"),
    ("BLOCK", WT, "git checkout -B main"),
    ("BLOCK", WT, "git branch -f main HEAD"),
    ("BLOCK", WT, "git update-ref refs/heads/main HEAD"),
    ("BLOCK", WT, "git rebase integration/mvp main"),
    ("BLOCK", ROOT, f"cd {WT} && npm test && git push origin main"),
    ("BLOCK", WT, "git worktree add ../x main"),
    ("ALLOW", WT, "git push origin ticket/6-custom"),
    ("ALLOW", WT, "git merge integration/mvp"),
    ("ALLOW", WT, "git rebase main"),
    ("ALLOW", WT, "git fetch origin main"),
    ("ALLOW", WT, "git log --oneline main..HEAD"),
    ("ALLOW", WT, "git diff main -- src"),
    ("ALLOW", WT, "git checkout main -- package.json"),
    ("ALLOW", WT, "git branch --merged main"),
    ("ALLOW", WT, "git reset --hard integration/mvp"),
    ("ALLOW", WT, "git switch -c ticket/6-custom"),
    # orchestrator 在主目錄合併與 push main 不受影響
    ("ALLOW", ROOT, "git switch main && git merge --ff-only integration/mvp && git push origin main"),
    ("ALLOW", ROOT, "git worktree remove .claude/worktrees/agent-x"),
]


def run(cwd: str, command: str) -> str:
    payload = json.dumps({"cwd": cwd, "tool_input": {"command": command}})
    proc = subprocess.run([str(HOOK)], input=payload, capture_output=True, text=True)
    return {0: "ALLOW", 2: "BLOCK"}.get(proc.returncode, f"EXIT{proc.returncode}: {proc.stderr.strip()}")


failures = [(want, cmd, got) for want, cwd, cmd in CASES if (got := run(cwd, cmd)) != want]
for want, cmd, got in failures:
    print(f"✗ 預期 {want}，實際 {got}：{cmd}")
print(f"{len(CASES) - len(failures)}/{len(CASES)} passed")
sys.exit(1 if failures else 0)
