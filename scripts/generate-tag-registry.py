#!/usr/bin/env python3
"""Generate tag names from the committed IANA snapshot, without network access."""
from pathlib import Path
import json, re, xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent.parent
ns = {'i': 'http://www.iana.org/assignments'}
registry = ET.parse(root / 'specs/iana-cbor-tags.xml').getroot()
updated = registry.findtext('i:updated', namespaces=ns)
records = []
for record in registry.findall('.//i:record', ns):
    value = record.findtext('i:value', '', ns)
    match = re.fullmatch(r'(\d+)(?:-(\d+))?', value)
    if not match:
        continue
    def content(name):
        element = record.find('i:' + name, ns)
        return '' if element is None else ''.join(element.itertext()).strip()
    references = []
    for reference in record.findall('i:xref', ns):
        data = reference.get('data', '')
        references.append('https://www.rfc-editor.org/rfc/' + data + '.html' if reference.get('type') == 'rfc' else data)
    records.append(dict(start=match[1], end=match[2] or match[1], name=content('semantics'), content=content('data'), references=references))
output = f'''/** Generated from the pinned IANA registry ({updated}). Names do not imply semantic validation. */
export interface TagDefinition {{ start: string; end: string; name: string; content: string; references: string[] }}
export const TAG_REGISTRY_UPDATED = '{updated}'
export const TAG_DEFINITIONS: readonly TagDefinition[] = ''' + json.dumps(records, ensure_ascii=False, indent=2) + '''

export function getTagDefinition(tag: number | bigint): TagDefinition | undefined {
  if (typeof tag === 'number' && (!Number.isSafeInteger(tag) || tag < 0)) return undefined
  const value = BigInt(tag)
  return TAG_DEFINITIONS.find(entry => value >= BigInt(entry.start) && value <= BigInt(entry.end))
}
'''
(root / 'src/parser/registry.ts').write_text(output)
print(f'{len(records)} registry records from {updated}')
