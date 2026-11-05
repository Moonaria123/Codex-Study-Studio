"""Freeze public excerpts from the locally retrieved upstream source files."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
source = (root / '_source/Tool_Use_README.md').read_text(encoding='utf-8').splitlines()
ranges = [(5, 67), (84, 108), (124, 126), (138, 141), (163, 180), (184, 192), (208, 210), (216, 216), (241, 245), (268, 291), (329, 333)]
excerpts = [{'start': a, 'end': b, 'text': '\n'.join(source[a-1:b])} for a, b in ranges]
(root / '_source/selected-excerpts.json').write_text(json.dumps(excerpts, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
index = []
for number, line in enumerate((root / '_source/Curriculum_README.md').read_text(encoding='utf-8').splitlines(), 1):
    match = re.match(r'\|\s*([^|]+?)\s*\|\s*\[Link\]\(\./(\d+)[^)]+\)', line)
    if match:
        url = re.search(r'\[Link\]\(\./([^)]+)\)', line).group(1)
        index.append({'number': match[2], 'title': match[1].strip(), 'path': url, 'line': number})
(root / '_source/curriculum-index.json').write_text(json.dumps(index, indent=2) + '\n', encoding='utf-8')
hashes = {name: hashlib.sha256((root / '_source' / name).read_bytes()).hexdigest() for name in ['Tool_Use_README.md', 'Curriculum_README.md', 'MICROSOFT-MIT-LICENSE.txt']}
(root / '_source/original-sha256.json').write_text(json.dumps(hashes, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'excerpts': len(excerpts), 'courseIndex': len(index)}))
