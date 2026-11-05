"""Split a verified page plan without changing the source or replacing files."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path, PureWindowsPath


def contained_path(root, relative):
    if not isinstance(relative, str) or not relative.strip():
        raise ValueError('Each output must be a nonempty relative path.')
    win = PureWindowsPath(relative)
    parts = re.split(r'[\\/]', relative)
    if win.drive or relative.startswith(('/', '\\')) or any(
        part in ('', '.', '..') or ':' in part for part in parts
    ):
        raise ValueError('Output paths must stay inside output_root.')
    result = root.joinpath(*parts).resolve()
    if not result.is_relative_to(root) or result == root:
        raise ValueError('Output path escapes output_root.')
    if result.suffix.lower() != '.pdf':
        raise ValueError('Every segment output must have a .pdf extension.')
    return result


def load_plan(plan_path, reader, output_root):
    plan = json.loads(plan_path.read_text(encoding='utf-8-sig'))
    source = (plan_path.parent / plan['source']).resolve()
    if 'output_root' in plan:
        raise ValueError('Set the authorised output directory with --output-root, not in the plan.')
    root = output_root.resolve()
    if source != Path(reader.stream.name).resolve():
        raise ValueError('Source changed during plan validation.')
    segments = plan.get('segments')
    if not isinstance(segments, list) or not segments:
        raise ValueError('Provide at least one segment.')
    total = len(reader.pages)
    coverage = [None] * total
    ids, destinations, result = set(), set(), []
    for entry in segments:
        if not isinstance(entry, dict):
            raise ValueError('Each segment must be an object.')
        sid, start, end = entry.get('id'), entry.get('start'), entry.get('end')
        if not isinstance(sid, str) or not sid or sid in ids:
            raise ValueError('Segment IDs must be unique nonempty strings.')
        if type(start) is not int or type(end) is not int or not 1 <= start <= end <= total:
            raise ValueError(f'Invalid page interval for segment {sid}.')
        title = entry.get('title')
        if not isinstance(title, str) or not title.strip():
            raise ValueError(f'Missing title for segment {sid}.')
        target = contained_path(root, entry.get('output'))
        target_key = str(target).casefold()
        if target_key in destinations or target.exists() or target == source:
            raise ValueError(f'Output already exists or is duplicated: {target}')
        for index in range(start - 1, end):
            if coverage[index] is not None:
                raise ValueError(f'Overlapping file page {index + 1}.')
            coverage[index] = sid
        result.append({**entry, 'target': target, 'page_count': end - start + 1})
        ids.add(sid)
        destinations.add(target_key)
    missing = [index + 1 for index, value in enumerate(coverage) if value is None]
    if missing:
        raise ValueError(f'Unassigned file pages: {missing}. Include front/back matter.')
    manifest = root / 'split_manifest.json'
    if manifest.exists():
        raise ValueError(f'Manifest already exists: {manifest}. Use a new staging folder.')
    return source, root, result, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--output-root', type=Path, required=True,
                        help='Verified reading folder; plan data cannot override this boundary.')
    parser.add_argument('--check', action='store_true', help='Validate without creating files.')
    args = parser.parse_args()
    try:
        from pypdf import PdfReader, PdfWriter
    except ImportError:
        parser.exit(2, 'pypdf is not installed. Use an existing PDF tool or obtain dependency approval.\n')
    plan_path = args.plan.resolve()
    try:
        raw = json.loads(plan_path.read_text(encoding='utf-8-sig'))
        source = (plan_path.parent / raw['source']).resolve()
        with source.open('rb') as source_stream:
            reader = PdfReader(source_stream)
            if reader.is_encrypted:
                raise ValueError('Encrypted source: provide an authorised decrypted copy first.')
            source, root, segments, manifest = load_plan(plan_path, reader, args.output_root)
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            records = [{k: v for k, v in entry.items() if k != 'target'} for entry in segments]
            report = {'schema': 1, 'source': str(source), 'source_sha256': source_hash,
                      'file_pages': len(reader.pages), 'output_root': str(root), 'segments': records}
            if args.check:
                print(json.dumps({'status': 'VALID', **report}, ensure_ascii=False))
                return
            # All destinations and intervals are checked before the first write.
            for entry, record in zip(segments, records):
                target = entry['target']
                target.parent.mkdir(parents=True, exist_ok=True)
                writer = PdfWriter()
                for index in range(entry['start'] - 1, entry['end']):
                    writer.add_page(reader.pages[index])
                writer.add_metadata({'/Title': entry['title']})
                with target.open('xb') as output:
                    writer.write(output)
                with target.open('rb') as output:
                    if len(PdfReader(output).pages) != entry['page_count']:
                        raise ValueError(f'Written page count mismatch: {target}')
                record['sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
                record['local_page_formula'] = f'original_file_page - {entry["start"]} + 1'
            if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
                raise ValueError('Source checksum changed; review outputs before use.')
            root.mkdir(parents=True, exist_ok=True)
            with manifest.open('x', encoding='utf-8') as output:
                json.dump(report, output, ensure_ascii=False, indent=2)
            print(json.dumps({'status': 'WRITTEN', 'manifest': str(manifest),
                              'segments': len(segments), 'pages': len(reader.pages)}, ensure_ascii=False))
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'{error}\nNo existing files were replaced. Retain any partial new outputs for review.\n')


if __name__ == '__main__':
    main()
