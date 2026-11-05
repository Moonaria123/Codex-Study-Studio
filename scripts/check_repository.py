"""Check release invariants with the Python standard library."""

import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import tempfile
import zipfile
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    checks = []
    required_notices = [line for line in (ROOT / "LICENSE").read_text(encoding="utf-8").splitlines()
                        if line.startswith("Required Notice:")]
    require(any("Moonaria123" in line for line in required_notices), "Original author notice missing")
    for filename in ("NOTICE.md", "LICENSING.md"):
        contents = (ROOT / filename).read_text(encoding="utf-8")
        require(all(line in contents.splitlines() for line in required_notices), "Required author notice drift")
    for path in (ROOT / "scripts").glob("*.py"):
        ast.parse(path.read_text(encoding="utf-8"), filename=path.name)
    checks.append("Python helper syntax")
    for language in ("en", "zh"):
        skill = ROOT / "skills" / f"study-studio-{language}"
        text = (skill / "SKILL.md").read_text(encoding="utf-8")
        require(text.startswith(f"---\nname: study-studio-{language}\n"), "Skill identity mismatch")
        require((skill / "LICENSE").read_bytes() == (ROOT / "LICENSE").read_bytes(), "Missing package licence")
        require((skill / "LICENSING.md").read_bytes() == (ROOT / "LICENSING.md").read_bytes(), "Package licensing policy drift")
        require(all(line in (skill / "NOTICE.md").read_text(encoding="utf-8").splitlines()
                    for line in required_notices), "Package author notice missing")
        for script in (skill / "scripts").glob("*.py"):
            ast.parse(script.read_text(encoding="utf-8"), filename=script.name)
    en = ROOT / "skills/study-studio-en"
    zh = ROOT / "skills/study-studio-zh"
    for folder in ("scripts", "assets/study-hub"):
        for path in (en / folder).rglob("*"):
            if path.is_file() and "__pycache__" not in path.parts:
                require(path.read_bytes() == (zh / path.relative_to(en)).read_bytes(), f"Runtime language drift: {path.name}")
    checks.append("Two complete licensed skill packages with identical runtimes")
    downloads = ROOT / "docs/downloads"
    expected_archives = {"study-studio-en.zip", "study-studio-zh.zip", "ai-agents-tool-use-example.zip"}
    checksums = dict(line.split(maxsplit=1)[::-1] for line in (downloads / "SHA256SUMS.txt").read_text().splitlines())
    require(set(checksums) == expected_archives, "Published archive list mismatch")
    for name, expected_hash in checksums.items():
        path = downloads / name
        require(hashlib.sha256(path.read_bytes()).hexdigest() == expected_hash, "Published archive checksum mismatch")
        prefix = name.removesuffix(".zip").removesuffix("-example")
        licence_name = "PROJECT-LICENSE.txt" if name.endswith("-example.zip") else "LICENSE"
        with zipfile.ZipFile(path) as archive:
            require(archive.testzip() is None, "Published archive is corrupt")
            for archived, source in ((licence_name, "LICENSE"), ("LICENSING.md", "LICENSING.md")):
                contents = archive.read(f"{prefix}/{archived}").decode("utf-8").replace("\r\n", "\n")
                require(contents == (ROOT / source).read_text(encoding="utf-8"), "Published archive licensing drift")
            notice_name = "PROJECT-NOTICE.md" if name.endswith("-example.zip") else "NOTICE.md"
            notice = archive.read(f"{prefix}/{notice_name}").decode("utf-8").splitlines()
            require(all(line in notice for line in required_notices), "Published archive author notice missing")
    checks.append("Published downloads, checksums and embedded licensing policy")
    spec = importlib.util.spec_from_file_location("installer", ROOT / "scripts/install.py")
    installer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(installer)
    with tempfile.TemporaryDirectory(prefix="study-studio-install-test-") as directory:
        destination = Path(directory) / "skills"
        paths = installer.install("both", destination)
        require(len(paths) == 2 and all((p / "SKILL.md").is_file() for p in paths), "Installation incomplete")
        sentinel = paths[0] / "user-note.txt"
        sentinel.write_text("preserve user work", encoding="utf-8")
        try:
            installer.install("both", destination)
        except FileExistsError:
            pass
        else:
            raise RuntimeError("Installer overwrote an existing skill")
        require(sentinel.read_text() == "preserve user work", "Existing content changed")
        second = Path(directory) / "partial"
        (second / "study-studio-zh").mkdir(parents=True)
        try:
            installer.install("both", second)
        except FileExistsError:
            pass
        else:
            raise RuntimeError("Installer ignored a second-target collision")
        require(not (second / "study-studio-en").exists(), "Preflight changed the first target before finding a conflict")
    checks.append("Real installation, no-overwrite and both-package preflight")
    for name in ("README.md", "README.zh-CN.md", "NOTICE.md", "LICENSING.md"):
        for target in re.findall(r"\]\(([^)]+)\)", (ROOT / name).read_text(encoding="utf-8")):
            if "://" not in target and not target.startswith("#"):
                require((ROOT / unquote(target.split("#")[0])).is_file(), f"Broken link in {name}: {target}")
    checks.append("README and attribution local links")
    course = ROOT / "examples/ai-agents-tool-use"
    manifest = json.loads((course / "StudyHub.html.manifest.json").read_text(encoding="utf-8"))
    require(hashlib.sha256((course / "StudyHub.html").read_bytes()).hexdigest() == manifest["sha256"], "Hub checksum mismatch")
    for item in manifest["inputs"]:
        require(not Path(item["file"]).is_absolute() and ":" not in item["file"], "Private absolute source path")
        require(hashlib.sha256((course / item["file"]).read_bytes()).hexdigest() == item["sha256"], "Source checksum mismatch")
    require((ROOT / "docs/demo/StudyHub.html").read_bytes() == (course / "StudyHub.html").read_bytes(), "Hosted hub drift")
    checks.append("Portable source manifest and hosted hub byte parity")
    result = {"status": "PASS", "checks": checks}
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
