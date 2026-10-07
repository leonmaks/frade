"""Declared preparation harness: negative child failures are expected assertions."""
import hashlib
import json
import pathlib
import shlex
import subprocess
import sys

LOG = pathlib.Path('/mnt/e/dev/codex/frade-worker-staging/w01-pre-tour-20261007/tour-final-logs')
CALLS = 0
def record_run(command, **kwargs):
    global CALLS
    child = subprocess.run(command, **kwargs)
    prefix = LOG / str(CALLS).zfill(4)
    prefix.with_suffix('.stdout').write_bytes(child.stdout)
    prefix.with_suffix('.stderr').write_bytes(child.stderr)
    prefix.with_suffix('.json').write_text(json.dumps({'argv':command,'exitCode':child.returncode,'stdoutSha256':hashlib.sha256(child.stdout).hexdigest(),'stderrSha256':hashlib.sha256(child.stderr).hexdigest()}))
    CALLS += 1
    return child

root = pathlib.Path.cwd()
rel = 'openspec/changes/frade-standard-workflow/evidence/d05-t01-pre-tour-20261007'
helper = rel+'/reader.py'
selection = json.loads((root/rel/'selection.json').read_bytes())
command, cursor, pieces, pages = ['python3','-B',helper,'tour','0'], 0, [], 0
summary = None
while True:
    child = record_run(command,capture_output=True)
    assert child.returncode == 0, child.stderr.decode()
    assert child.stderr == b''
    assert len(child.stdout) <= 4800
    value = json.loads(child.stdout)
    assert value['cursor'] == cursor
    assert value['next'] > cursor or value['eof']
    if summary is None:
        summary = value['verification']
    assert value['verification'] == summary
    pieces.append(value['text'])
    pages += 1
    cursor = value['next']
    if value['eof']:
        assert value['nextCommand'] is None
        break
    command = shlex.split(value['nextCommand'])
    assert command[:4] == ['python3','-B',helper,'tour']
    assert command[4] == str(cursor)
text = ''.join(pieces)
for name in selection['paths']:
    raw = (root/name).read_bytes()
    assert name in text
    assert hashlib.sha256(raw).hexdigest() in text
    assert raw.decode('utf-8') in text
assert summary['artifactsVerified'] == 231
assert summary['validationInputsDecodedVerified'] == 174
assert summary['retainedRawPayloadsDecodedVerified'] > 12
# Independently exercise a generated file-read command, including exact byte completion.
manifest = json.loads((root/'REVIEW-PACKET-MANIFEST.json').read_bytes())
file_id = next(i for i,v in enumerate(manifest['artifacts']) if v['path'].endswith('/d05-t01-accepted-20261007/decision.json'))
child = record_run(['python3','-B',helper,'file',str(file_id),'0'],capture_output=True)
assert child.returncode == 0 and len(child.stdout) <= 4800
first = json.loads(child.stdout)
assert first['verification']['sourceSha256'] == manifest['artifacts'][file_id]['sha256']
# Declared negative control: corrupt only the disposable clone, assert rejection, restore it.
target = root/manifest['artifacts'][0]['path']
original = target.read_bytes()
try:
    target.write_bytes(original+b'corrupted staged fixture')
    denied = record_run(['python3','-B',helper,'tour','0'],capture_output=True)
    assert denied.returncode != 0 and b'artifact mismatch' in denied.stderr
finally:
    target.write_bytes(original)
print(json.dumps({'status':'PASS','completeTourPages':pages,'completeSemanticPaths':len(selection['paths']),
                  'tourCharacters':len(text),'verification':summary,'literalNextCommandsExecuted':pages-1,
                  'assertedCorruptCloneDenial':1,'ownerCandidateChanged':False,'reviewAdmitted':False}))
