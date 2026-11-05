"""Validate source mapping and reviewed data before media production."""
from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[1]
load = lambda path: json.loads((root / path).read_text(encoding='utf-8'))
slides = load('_studio/slide-content.json')['slides']
studio = load('_studio/chapter-studio.json')
questions = load('_studio/chapter-questions.json')['questions']
excerpts = load('_source/selected-excerpts.json')

def walk(node):
    yield node
    for child in node.get('children', []):
        yield from walk(child)

nodes = list(walk(studio['root']))
kids = {f'T-K{i:02}' for i in range(1, 9)}
checks = {
    'unique_node_ids': len({n['id'] for n in nodes}) == len(nodes),
    'unique_card_ids': len({c['id'] for c in studio['cards']}) == len(studio['cards']),
    'unique_question_ids': len({q['id'] for q in questions}) == len(questions),
    'complete_question_options_and_analysis': all(set(q['options']) == set('ABCD') and q['answer'] in q['options'] and set(q['option_analysis']) == set('ABCD') for q in questions),
    'original_questions_with_locators': all(q['original'] and 'lines' in q['subsection'] and q['pages'] == [] for q in questions),
    'all_knowledge_ids_on_slides': kids <= {k for s in slides for k in s['knowledge_ids']},
    'all_knowledge_ids_in_cards': kids <= {k for c in studio['cards'] for k in c['knowledge_ids']},
    'all_knowledge_ids_in_questions': kids <= {k for q in questions for k in q['knowledge_points']},
    'all_knowledge_ids_on_map': kids <= {n['id'] for n in nodes},
    'all_nodes_have_substantive_details': all(isinstance(n.get('details'), str) and len(n['details'].strip()) > len(n['summary']) and '\n\n' in n['details'] for n in nodes),
    'all_nodes_have_frozen_source_indexes': all(n.get('source', {}).get('title') and n['source'].get('edition') == 'Revision f09e94ffe170f8af6d3db7c42987bbe4db227723' and n['source'].get('pdfPages') == [] and n['source'].get('url', '').startswith('https://github.com/microsoft/ai-agents-for-beginners/blob/f09e94ffe170f8af6d3db7c42987bbe4db227723/04-tool-use/README.md#L') for n in nodes),
    'slide_bullet_limits': all(len(s['bullets']) <= 4 and all(len(b) <= 100 for b in s['bullets']) for s in slides),
    'source_ranges_valid': all(1 <= p['start'] <= p['end'] <= 360 for p in excerpts),
    'thinking_pause_precedes_solution': slides[8].get('thinking_seconds') == 5 and slides[9]['visual'] == 'worked-answer',
    'public_timezone_utc': load('study-hub.json')['timeZone'] == 'UTC',
}
raw = root / '_source/Tool_Use_README.md'
if raw.exists():
    lines = raw.read_text(encoding='utf-8').splitlines()
    checks['source_excerpts_exact'] = all(p['text'] == '\n'.join(lines[p['start']-1:p['end']]) for p in excerpts)
hashes = load('_source/original-sha256.json')
checks['available_original_hashes_match'] = all(hashlib.sha256((root / '_source' / name).read_bytes()).hexdigest() == digest for name, digest in hashes.items() if (root / '_source' / name).exists())
learner_files = list(root.glob('*.md')) + list((root / 'Chapter 04 - Tool Use').glob('*.md')) + list((root / '_studio').glob('chapter-*.json'))
checks['no_protective_disclaimers'] = not any(term in p.read_text(encoding='utf-8').lower() for p in learner_files for term in ['for reference only', 'no guarantee', 'verify independently'])
checks['no_unrelated_course_defaults'] = not any(term in p.read_text(encoding='utf-8') for p in learner_files for term in ['HKICPA', 'Asia/Singapore'])
evidence = {'date': '2026-11-02', 'checks': checks, 'counts': {'slides': len(slides), 'narrationWords': sum(len(s['narration'].split()) for s in slides), 'mapNodes': len(nodes), 'flashcards': len(studio['cards']), 'questions': len(questions), 'knowledgePoints': len(kids)}, 'runtimeAndMediaValidation': 'Separate production-lane evidence'}
(root / '_studio/content-validation.json').write_text(json.dumps(evidence, indent=2) + '\n', encoding='utf-8')
print(json.dumps(evidence))
if not all(checks.values()):
    raise SystemExit('Content validation failed')
