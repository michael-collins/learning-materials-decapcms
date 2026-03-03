#!/usr/bin/env python3
"""Add default values to config.yml fields: license, aiLicense, publishEmbed, version."""
import re

with open('public/admin/config.yml', 'r') as f:
    content = f.read()

# 1. License fields: add default: "CC BY 4.0" where not already present
content = re.sub(
    r'(\{label: "License", name: "license", widget: "select", required: false,)(?! default:)',
    r'\1 default: "CC BY 4.0",',
    content
)

# 2. publishEmbed: change default: false to default: true
content = content.replace(
    'name: "publishEmbed", widget: "boolean", default: false',
    'name: "publishEmbed", widget: "boolean", default: true'
)

# 3. AI License: normalize all to default: ["AIUL-WA"]
# First handle ones that already have defaults - replace them
content = re.sub(
    r'(name: "aiLicense", widget: "select", required: false, multiple: true,) default: \[[^\]]*\],',
    r'\1 default: ["AIUL-WA"],',
    content
)
# Then handle ones without defaults
content = re.sub(
    r'(name: "aiLicense", widget: "select", required: false, multiple: true,)(?! default:)',
    r'\1 default: ["AIUL-WA"],',
    content
)

# 4. Version fields: add default "1.0.0"
content = re.sub(
    r'(name: "version", widget: "string", pattern: \[.*?\], required: false,)(?! default:)',
    r'\1 default: "1.0.0",',
    content
)

with open('public/admin/config.yml', 'w') as f:
    f.write(content)

# Verify
license_defaults = len(re.findall(r'name: "license".*default: "CC BY 4.0"', content))
embed_defaults = len(re.findall(r'name: "publishEmbed".*default: true', content))
ai_defaults = len(re.findall(r'name: "aiLicense".*default: \["AIUL-WA"\]', content))
version_defaults = len(re.findall(r'name: "version".*default: "1.0.0"', content))

print(f'License defaults (CC BY 4.0): {license_defaults}')
print(f'Publish Embed defaults (true): {embed_defaults}')
print(f'AI License defaults (AIUL-WA): {ai_defaults}')
print(f'Version defaults (1.0.0): {version_defaults}')
print('Done!')
