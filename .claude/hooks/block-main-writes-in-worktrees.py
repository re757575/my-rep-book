#!/usr/bin/python3 -I
"""PreToolUse hook：在 .claude/worktrees/ 底下的 subagent 只能寫自己的 ticket 分支。

擋下任何會寫入 main 的 git 指令；合併到 main 由 orchestrator 在使用者授權後處理。
判斷「在 worktree 內」：hook 的 cwd，或指令本身以 `-C`／`cd` 指向 .claude/worktrees/。
"""

from __future__ import annotations

import json
import re
import shlex
import sys

WORKTREE_MARK = ".claude/worktrees/"
MAIN_REFS = {"main", "refs/heads/main"}
GIT_GLOBAL_OPTS_WITH_VALUE = {"-C", "-c", "--git-dir", "--work-tree", "--namespace"}
READ_ONLY_BRANCH_FLAGS = {"--merged", "--no-merged", "--contains", "--no-contains", "--list", "-l"}


def is_main_ref(arg: str) -> bool:
    return arg.lstrip("+") in MAIN_REFS


def targets_main(arg: str) -> bool:
    """refspec 的目的端是 main，例如 `HEAD:main`、`+x:refs/heads/main`、`:main`。"""
    return ":" in arg and arg.rsplit(":", 1)[1] in MAIN_REFS


def split_segments(command: str) -> list[list[str]]:
    segments = []
    for part in re.split(r"&&|\|\||;|\||\n", command):
        try:
            tokens = shlex.split(part)
        except ValueError:
            tokens = part.split()
        if tokens:
            segments.append(tokens)
    return segments


def git_subcommand(tokens: list[str]) -> tuple[str, list[str]] | None:
    if "git" not in tokens:
        return None
    rest = tokens[tokens.index("git") + 1 :]
    while rest and rest[0].startswith("-"):
        opt = rest.pop(0)
        if opt in GIT_GLOBAL_OPTS_WITH_VALUE and rest:
            rest.pop(0)
    if not rest:
        return None
    return rest[0], rest[1:]


def writes_main(sub: str, args: list[str]) -> bool:
    positionals = [a for a in args if not a.startswith("-")]

    if sub == "push":
        return (
            any(is_main_ref(a) or targets_main(a) for a in positionals)
            or "--all" in args
            or "--mirror" in args
        )
    if sub in ("fetch", "pull"):
        return any(targets_main(a) for a in positionals)
    if sub == "checkout" and "--" in args:
        return False  # `git checkout main -- <path>` 只是從 main 取出檔案，不會切換分支
    if sub in ("switch", "checkout"):
        return any(is_main_ref(a) for a in args)
    if sub == "branch":
        if READ_ONLY_BRANCH_FLAGS & set(args):
            return False
        return any(is_main_ref(a) for a in args)
    if sub == "update-ref":
        return any(is_main_ref(a) for a in args)
    if sub == "rebase":
        # `git rebase <upstream> main` 會先切到 main；`git rebase main` 只改寫目前分支
        return any(is_main_ref(a) for a in positionals[1:])
    if sub == "worktree":
        return bool(positionals) and positionals[0] == "add" and any(is_main_ref(a) for a in args)
    return False


def main() -> int:
    data = json.load(sys.stdin)
    command = (data.get("tool_input") or {}).get("command") or ""
    in_worktree = WORKTREE_MARK in (data.get("cwd") or "") or WORKTREE_MARK in command
    if not in_worktree:
        return 0

    for tokens in split_segments(command):
        parsed = git_subcommand(tokens)
        if parsed and writes_main(*parsed):
            print(
                f"BLOCKED：`{' '.join(tokens)}` 會寫入 main。"
                "你在 .claude/worktrees/ 的 subagent worktree 內，只能 commit 到自己的 ticket 分支；"
                "合併到 main、push、部署與關閉 issue 由 orchestrator 在使用者授權後處理。",
                file=sys.stderr,
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
