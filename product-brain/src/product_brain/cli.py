from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import __version__
from .config import load as load_config


def _cmd_init(args):
    from .init_brain import init_brain_repo

    target = Path(args.path or ".").resolve()
    result = init_brain_repo(target, force=args.force)
    print(f"initialized brain repo at {result['brain_path']}")
    print(f"  config: {result['config']}")
    print(f"  next:   {result['next']}")


def _cmd_bind(args):
    from .bind import add_to_config, bind_repo

    config_path = args.config
    if config_path:
        config_dir = Path(config_path).parent.resolve()
    else:
        config_dir = Path.cwd().resolve()
        config_path = str(config_dir / "config.yaml")

    source_path = Path(args.source).resolve()
    repo_name = args.name or source_path.name

    config = None
    llm_call = None
    ticket_regex = args.ticket_regex
    try:
        config = load_config(config_path)
        ticket_regex = ticket_regex or config.ticket_regex
        if not args.no_llm:
            from .backfill.summarize import llm_call_factory
            try:
                llm_call = llm_call_factory(config, model=config.llm.model_summarize)
            except Exception:
                llm_call = None
    except FileNotFoundError:
        pass

    manifest = bind_repo(
        brain_root=config_dir,
        source_path=source_path,
        repo_name=repo_name,
        ticket_regex=ticket_regex or r"AHA-\d+",
        llm_call=llm_call,
        force=args.force,
    )

    if config is not None:
        add_to_config(config_dir, repo_name, source_path)

    print(f"bound {source_path} as '{repo_name}'")
    print(f"  manifest:     {config_dir}/repos/{repo_name}/manifest.md")
    print(f"  workflow:     {manifest.workflow}")
    print(f"  languages:    {', '.join(manifest.languages) or '(none detected)'}")
    print(f"  entry_points: {', '.join(manifest.entry_points) or '(none detected)'}")
    print(f"  prose body:   {'LLM-generated' if llm_call else 'placeholder (edit by hand)'}")


def _cmd_migrate(args):
    from .migrate import migrate_source

    config = load_config(args.config)
    repo_cfg = config.repo(args.repo)
    result = migrate_source(
        brain_root=config.brain_root,
        source_path=repo_cfg.path,
        repo_name=args.repo,
        remove_from_source=args.remove_from_source,
    )
    print(json.dumps(result, indent=2))


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
    from .incremental import run_for_source
    sys.exit(run_for_source(args.repo, args.since, args.config))


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

    p = sub.add_parser("init", help="bootstrap an empty brain repo (config.yaml, repos/, .gitignore, README)")
    p.add_argument("--path", help="where to create the brain repo; defaults to cwd")
    p.add_argument("--force", action="store_true", help="overwrite existing config.yaml")
    p.set_defaults(func=_cmd_init)

    p = sub.add_parser("bind", help="bind a source repo into this brain (writes manifest, updates config)")
    p.add_argument("source", help="path to the source git repo")
    p.add_argument("--name", help="short name for the repo; defaults to source dir name")
    p.add_argument("--ticket-regex", help="override ticket regex; default from config or AHA-\\d+")
    p.add_argument("--no-llm", action="store_true", help="skip LLM prose generation")
    p.add_argument("--force", action="store_true", help="overwrite existing manifest")
    p.set_defaults(func=_cmd_bind)

    p = sub.add_parser("migrate", help="copy legacy in-repo .product-brain/ into the brain repo layout")
    p.add_argument("--repo", required=True, help="repo name (must be in config)")
    p.add_argument("--remove-from-source", action="store_true",
                   help="delete .product-brain/ from source after copy")
    p.set_defaults(func=_cmd_migrate)

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

    p = sub.add_parser("incremental", help="post-merge target: update one repo's records")
    p.add_argument("--repo", required=True, help="repo name (must be in config)")
    p.add_argument("--since", help="git SHA; default: parent of HEAD")
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
