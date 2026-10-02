"""Read-only check: report matches by filename, never credential values."""
import base64
import json
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
apk = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.local/releases/sihhat-uz-preview.apk'
secrets = []
for source in (root / '.local/secrets/providers.env', root / 'apps/api/.env'):
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        name, sep, value = line.partition('=')
        if sep and any(term in name for term in ('KEY', 'TOKEN', 'SECRET', 'PASSWORD')):
            value = value.strip().strip('"').strip("'")
            if len(value) >= 12 and not value.startswith('replace-'):
                secrets.append(value)
patterns = {encoded for secret in secrets for encoded in (secret.encode(), secret.encode('utf-16-le'), base64.b64encode(secret.encode()))}
matches = []
with zipfile.ZipFile(apk) as archive:
    for item in archive.infolist():
        if item.is_dir():
            continue
        data = archive.read(item)
        if any(pattern in data for pattern in patterns):
            matches.append(item.filename)
report = {'apk': apk.name, 'credential_patterns_checked': len(patterns), 'secret_matches': matches}
print(json.dumps(report))
if matches:
    sys.exit(1)
