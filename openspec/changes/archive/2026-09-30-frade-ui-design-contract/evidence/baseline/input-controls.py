"""Audit the supplied token checker in isolated temp copies; no adoption implied."""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
sys.dont_write_bytecode = True
source = Path(' _input/frade-ui-style-guide-v1').resolve()
reports = []
for name in ('positive', 'drift', 'contrast'):
    with tempfile.TemporaryDirectory(prefix='frade-ui-token-audit-') as folder:
        root = Path(folder)
        for file in ('tokens.json', 'tokens.css', 'generate-tokens.py', 'check-tokens.py'):
            shutil.copyfile(source / file, root / file)
        if name == 'drift':
            with (root / 'tokens.css').open('a') as stream:
                stream.write('\n/* isolated drift fixture */\n')
        if name == 'contrast':
            data = json.loads((root / 'tokens.json').read_text())
            data['themes']['light']['text.primary'] = '#FFFFFF'
            (root / 'tokens.json').write_text(json.dumps(data))
            subprocess.run([sys.executable, '-B', str(root / 'generate-tokens.py')], check=True, capture_output=True)
        result = subprocess.run([sys.executable, '-B', str(root / 'check-tokens.py')], capture_output=True, text=True)
        reports.append({'control': name, 'exitCode': result.returncode, 'stdout': result.stdout.strip(),
                        'stderr': result.stderr.strip(), 'expectedExit': 0 if name == 'positive' else 1})
        assert result.returncode == reports[-1]['expectedExit'], reports[-1]
    reports[-1]['fixtureRemoved'] = not root.exists()
    assert reports[-1]['fixtureRemoved']
destination = Path('openspec/changes/frade-ui-design-contract/evidence/baseline/input-controls-result.json')
destination.write_text(json.dumps({'scope': 'supplied checker only, not Frade CI', 'results': reports}, indent=2) + '\n')
print(json.dumps(reports))
