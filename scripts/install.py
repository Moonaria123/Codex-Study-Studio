"""Install the selected self-contained skill without overwriting an existing one."""

import argparse
import os
from pathlib import Path
import shutil
import sys


def install(language: str, destination: Path) -> list[Path]:
    root = Path(__file__).resolve().parents[1]
    languages = ("en", "zh") if language == "both" else (language,)
    pairs = [(root / "skills" / f"study-studio-{lang}", destination / f"study-studio-{lang}") for lang in languages]
    for source, target in pairs:
        if not (source / "SKILL.md").is_file() or not (source / "LICENSE").is_file():
            raise ValueError(f"Incomplete skill package: {source.name}")
        if target.exists() or target.is_symlink():
            raise FileExistsError(f"Already exists; no files changed: {target}. Back up and review your existing skill first.")
    destination.mkdir(parents=True, exist_ok=True)
    installed = []
    for source, target in pairs:
        shutil.copytree(source, target, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        installed.append(target)
    return installed


def main() -> int:
    default_home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", choices=("en", "zh", "both"), default="en")
    parser.add_argument("--dest", type=Path, default=default_home / "skills", help="Skills directory; defaults to $CODEX_HOME/skills or ~/.codex/skills")
    args = parser.parse_args()
    try:
        for target in install(args.language, args.dest.expanduser()):
            print(f"Installed: {target}")
    except (OSError, ValueError) as error:
        print(f"Installation stopped: {error}", file=sys.stderr)
        return 1
    print("Use $study-studio-en or $study-studio-zh on your next Codex turn.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
