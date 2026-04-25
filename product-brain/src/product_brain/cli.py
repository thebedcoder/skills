from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .config import load as load_config


def _cmd_backfill(args):
    from .backfill.run import backfill_repo
    config = load_config(args.config)
    repos = [args.repo] if args.repo else [r.name for r in config.repos]
    for r in repos:
        result = backfill_repo(
            config, r,
            since=args.since,
            force=args.force,
            skip_llm=args.no_llm,
        )
        print(json.dumps(result, indent=2))


def _cmd_sync(args):
    _cmd_backfill(args)


def _cmd_repair(args):
    from .repair import repair_repo
    config = load_config(args.config)
    repos = [args.repo] if args.repo else [r.name for r in config.repos]
    for r in repos:
        print(json.dumps(repair_repo(config, r), indent=2))


def _cmd_incremental(args):
    from .incremental import run_for_current_commit
    sys.exit(run_for_current_commit(Path(args.repo or ".").resolve()))


def _cmd_bot_serve(args):
    import uvicorn
    from .bot.webhook import build_app
    config = load_config(args.config)
    app = build_app(config)
    uvicorn.run(app, host=config.bot.host, port=config.bot.port)


def _cmd_bot_worker(args):
    from .bot.worker import run_worker
    config = load_config(args.config)
    run_worker(config)


def _cmd_bot_status(args):
    from .bot.queue import Queue
    config = load_config(args.config)
    q = Queue(config.queue.path)
    print(json.dumps(q.depth(), indent=2))


def _cmd_bot_tail_audit(args):
    from .bot.audit import AuditLog
    config = load_config(args.config)
    a = AuditLog(config.audit.path)
    for entry in reversed(a.tail(args.limit)):
        print(f"{entry.timestamp:.0f} {entry.command:8s} {entry.ticket_id:12s} {entry.requester:20s} {entry.output_summary or entry.error or ''}")


def _cmd_run(args):
    from .planner import run_command
    config = load_config(args.config)
    body, summary, model, cost = run_command(config, args.command, args.ticket, args.args or "")
    print(body)
    print("\n---\n", summary, file=sys.stderr)


def main():
    parser = argparse.ArgumentParser("product-brain")
    parser.add_argument("--config", help="path to config.yaml")
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("backfill", help="rebuild ticket records from git log")
    p.add_argument("--repo")
    p.add_argument("--since")
    p.add_argument("--force", action="store_true")
    p.add_argument("--no-llm", action="store_true", help="rebuild front-matter only")
    p.set_defaults(func=_cmd_backfill)

    p = sub.add_parser("sync", help="alias for backfill (incremental by default)")
    p.add_argument("--repo")
    p.add_argument("--since")
    p.add_argument("--force", action="store_true")
    p.add_argument("--no-llm", action="store_true")
    p.set_defaults(func=_cmd_sync)

    p = sub.add_parser("repair", help="validate citations and reconcile state")
    p.add_argument("--repo")
    p.set_defaults(func=_cmd_repair)

    p = sub.add_parser("incremental", help="post-merge hook target")
    p.add_argument("--repo", help="repo path; defaults to cwd")
    p.set_defaults(func=_cmd_incremental)

    p = sub.add_parser("run", help="run a command (groom, estimate, edges, ...) for a ticket")
    p.add_argument("command", choices=["groom", "estimate", "edges", "related", "draft-tickets"])
    p.add_argument("ticket")
    p.add_argument("--args", default="")
    p.set_defaults(func=_cmd_run)

    bot = sub.add_parser("bot", help="bot subcommands")
    bot_sub = bot.add_subparsers(dest="bot_cmd", required=True)

    p = bot_sub.add_parser("serve", help="run the webhook server")
    p.set_defaults(func=_cmd_bot_serve)

    p = bot_sub.add_parser("worker", help="run the job worker")
    p.set_defaults(func=_cmd_bot_worker)

    p = bot_sub.add_parser("status", help="queue depth and worker health")
    p.set_defaults(func=_cmd_bot_status)

    p = bot_sub.add_parser("tail-audit", help="follow the audit log")
    p.add_argument("--limit", type=int, default=50)
    p.set_defaults(func=_cmd_bot_tail_audit)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
