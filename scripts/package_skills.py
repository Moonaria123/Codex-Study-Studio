"""Package self-contained language skills and record release checksums."""

import hashlib
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    checksums = []
    for language in ("en", "zh"):
        name = f"study-studio-{language}"
        source = ROOT / "skills" / name
        if not all((source / name).is_file() for name in ("LICENSE", "LICENSING.md", "NOTICE.md")):
            raise RuntimeError("Every skill archive must include its licence, policy and author notice")
        destination = output / f"{name}.zip"
        with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(source.rglob("*")):
                if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                    archive.write(path, (Path(name) / path.relative_to(source)).as_posix())
        with zipfile.ZipFile(destination) as archive:
            if archive.testzip() is not None:
                raise RuntimeError(f"Archive verification failed: {name}")
        checksums.append(f"{hashlib.sha256(destination.read_bytes()).hexdigest()}  {destination.name}")
        print(f"Packaged {destination.name}: {destination.stat().st_size} bytes")
    # Use the publication allowlist, never the working folder's private source copies.
    course = ROOT / "examples/ai-agents-tool-use"
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z", "--", "examples/ai-agents-tool-use"], cwd=ROOT
    ).decode("utf-8").split("\0")
    sample_files = {ROOT / name for name in tracked if name}
    sample_files.update({course / "README.md", course / "_studio/node-details.json"})
    destination = output / "ai-agents-tool-use-example.zip"
    with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(sample_files):
            relative = path.relative_to(course)
            archive.write(path, (Path("ai-agents-tool-use") / relative).as_posix())
        archive.write(ROOT / "LICENSE", "ai-agents-tool-use/PROJECT-LICENSE.txt")
        archive.write(ROOT / "LICENSING.md", "ai-agents-tool-use/LICENSING.md")
        archive.write(ROOT / "skills/study-studio-en/NOTICE.md", "ai-agents-tool-use/PROJECT-NOTICE.md")
    with zipfile.ZipFile(destination) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Sample archive verification failed")
    checksums.append(f"{hashlib.sha256(destination.read_bytes()).hexdigest()}  {destination.name}")
    print(f"Packaged {destination.name}: {destination.stat().st_size} bytes")
    (output / "SHA256SUMS.txt").write_text("\n".join(checksums) + "\n", encoding="utf-8")
    published = ROOT / "docs/downloads"
    published.mkdir(exist_ok=True)
    for name in ("study-studio-en.zip", "study-studio-zh.zip", "ai-agents-tool-use-example.zip", "SHA256SUMS.txt"):
        shutil.copyfile(output / name, published / name)


if __name__ == "__main__":
    main()
