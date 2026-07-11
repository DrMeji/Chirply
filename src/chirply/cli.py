from __future__ import annotations

import argparse

from chirply.desktop_app import run_desktop_app


def main() -> int:
    parser = argparse.ArgumentParser(prog="chirply", description="Chirply — bird sound ID")
    sub = parser.add_subparsers(dest="cmd")
    sub.add_parser("app", help="Open Chirply in a native Windows window")
    args = parser.parse_args()
    if args.cmd == "app" or args.cmd is None:
        return run_desktop_app()
    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
