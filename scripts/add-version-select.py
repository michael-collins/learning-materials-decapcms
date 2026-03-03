#!/usr/bin/env python3
"""Add version_select fields after every relation field that references a versioned collection."""
import re

VERSIONED_COLLECTIONS = {
    'articles', 'exercises', 'lectures', 'lessons',
    'pathways', 'projects', 'specializations', 'tutorials',
}

with open('public/admin/config.yml', 'r') as f:
    lines = f.readlines()

# First pass: identify all relation field blocks (single-line and multi-line)
# and where to insert version_select after them
insertions = []  # list of (line_index_after, indent, field_name, collection)

i = 0
while i < len(lines):
    line = lines[i]

    if 'widget: "relation"' not in line:
        i += 1
        continue

    col_match = re.search(r'collection: "([^"]+)"', line)
    name_match = re.search(r'name: "([^"]+)"', line)

    if col_match and name_match:
        # Single-line: everything on one line
        collection = col_match.group(1)
        field_name = name_match.group(1)
        if collection in VERSIONED_COLLECTIONS:
            indent = line[:len(line) - len(line.lstrip())]
            insertions.append((i + 1, indent, field_name, collection, 'single'))
        i += 1
    else:
        # Multi-line: scan backward for name, forward for collection & end
        field_name = None
        collection = col_match.group(1) if col_match else None

        # Find the "- label:" line that started this field block
        start_line = i
        for back in range(i - 1, max(0, i - 5), -1):
            if re.match(r'^(\s+)- label:', lines[back]):
                start_line = back
                break

        # Get field name from nearby lines
        for k in range(start_line, min(i + 2, len(lines))):
            nm = re.search(r'name: "([^"]+)"', lines[k])
            if nm:
                field_name = nm.group(1)
                break

        # Scan forward to find collection and end of block
        widget_indent = len(line) - len(line.lstrip())
        end_line = i
        for j in range(i + 1, min(i + 15, len(lines))):
            fwd = lines[j]
            fwd_stripped = fwd.strip()
            if not fwd_stripped:
                continue
            fwd_indent = len(fwd) - len(fwd.lstrip())
            # If indent <= the "- label:" line's indent+2, it's a sibling field
            if fwd_indent < widget_indent and fwd_stripped.startswith('- '):
                break
            if not collection:
                cm = re.search(r'collection: "([^"]+)"', fwd)
                if cm:
                    collection = cm.group(1)
            end_line = j

        if field_name and collection and collection in VERSIONED_COLLECTIONS:
            # The "- label:" line determines the sibling indent
            label_line = lines[start_line]
            m = re.match(r'^(\s+)-', label_line)
            indent = m.group(1) if m else ' ' * (widget_indent - 2)
            insertions.append((end_line + 1, indent, field_name, collection, 'multi'))

        i = end_line + 1

# Second pass: insert version_select lines (reverse order to preserve line numbers)
for insert_at, indent, field_name, collection, mode in reversed(insertions):
    if mode == 'single':
        version_line = (
            f'{indent}- {{label: "Version", name: "{field_name}_version", '
            f'widget: "version_select", required: false, default: "latest", '
            f'hint: "Pin to a specific version or use latest", '
            f'collection: "{collection}", relation_field: "{field_name}"}}\n'
        )
        lines.insert(insert_at, version_line)
    else:
        version_block = (
            f'{indent}- label: "Version"\n'
            f'{indent}  name: "{field_name}_version"\n'
            f'{indent}  widget: "version_select"\n'
            f'{indent}  required: false\n'
            f'{indent}  default: "latest"\n'
            f'{indent}  hint: "Pin to a specific version or use latest"\n'
            f'{indent}  collection: "{collection}"\n'
            f'{indent}  relation_field: "{field_name}"\n'
        )
        lines.insert(insert_at, version_block)

with open('public/admin/config.yml', 'w') as f:
    f.writelines(lines)

print(f'Added {len(insertions)} version_select fields for versioned collections')
print(f'Versioned collections: {sorted(VERSIONED_COLLECTIONS)}')
print('Done!')

print('Done!')
