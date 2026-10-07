"""Read-only prepared review tour. Produces source and mechanical facts, no verdict."""
import base64
import hashlib
import json
import pathlib
import shlex
import sys

ROOT = pathlib.Path.cwd().resolve()
SELF = pathlib.Path(__file__).resolve().relative_to(ROOT).as_posix()
CHECKED_DIRECTORIES = set()


def load(name):
    p = ROOT / name
    if pathlib.Path(name).is_absolute() or '..' in pathlib.Path(name).parts:
        raise ValueError('packet-relative path required')
    for part in p.parents:
        if part == ROOT:
            break
        if part in CHECKED_DIRECTORIES:
            continue
        if part.is_symlink():
            raise ValueError('symlink unavailable')
        if not part.is_dir():
            raise ValueError('directory required')
        CHECKED_DIRECTORIES.add(part)
    if p.is_symlink() or not p.is_file():
        raise ValueError('regular input required')
    return p.read_bytes()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def materialize():
    raw_manifest = load('REVIEW-PACKET-MANIFEST.json')
    manifest = json.loads(raw_manifest)
    data, seen = {}, set()
    for item in manifest['artifacts']:
        if item['path'] in seen:
            raise ValueError('duplicate artifact')
        seen.add(item['path'])
        raw = load(item['path'])
        if len(raw) != item['bytes'] or sha(raw) != item['sha256']:
            raise ValueError('artifact mismatch: ' + item['path'])
        data[item['path']] = raw
    verified_inputs, payloads, correspondences = 0, 0, 0
    proposal = 'openspec/changes/frade-standard-workflow/evidence/d05-order-proposal-20261007'
    accepted = 'openspec/changes/frade-standard-workflow/evidence/d05-t01-accepted-20261007'
    current_decision = json.loads(data[accepted+'/decision.json'])
    overlay = {item['path']:item for item in current_decision['approvedArtifacts']}
    def bound(name, size, digest):
        raw = data[name]
        if len(raw) != size or sha(raw) != digest:
            raise ValueError('cross-binding mismatch: ' + name)
    for item in current_decision['approvedArtifacts']:
        bound(proposal+'/artifacts/'+item['path'],item['proposedBytes'],item['proposedSha256'])
    historical = json.loads(data[proposal+'/historical-replay-mapping.json'])
    for item in historical['inventory']:
        bound(proposal+'/historical-replay/tree/'+item['originalPath'],item['bytes'],item['sha256'])
        if item['originalPath'] in data:
            bound(item['originalPath'],item['bytes'],item['sha256'])
    for name, raw in data.items():
        if name.endswith('/strict-validation-inputs.json'):
            for item in json.loads(raw)['inputs']:
                decoded = base64.b64decode(item['data'], validate=True)
                if len(decoded) != item['bytes'] or sha(decoded) != item['sha256']:
                    raise ValueError('validation input mismatch')
                if item['correctedOverlay']:
                    target = overlay[item['path']]
                    if decoded != data[proposal+'/artifacts/'+item['path']] or item['sha256'] != target['proposedSha256']:
                        raise ValueError('overlay correspondence mismatch')
                    correspondences += 1
                elif item['sha256'] != item['installedOwnerSha256']:
                    raise ValueError('installed correspondence mismatch')
                if item['path'] in data and sha(data[item['path']]) != item['installedOwnerSha256']:
                    raise ValueError('available installed bytes mismatch')
                verified_inputs += 1
        elif name.endswith('.raw-base64.json'):
            item = json.loads(raw)
            decoded = base64.b64decode(item.get('data', item.get('base64')), validate=True)
            if len(decoded) != item.get('bytes', item.get('rawBytes')) or sha(decoded) != item.get('sha256', item.get('rawSha256')):
                raise ValueError('retained raw payload mismatch')
            payloads += 1
    summary = {'packetManifestSha256':sha(raw_manifest), 'artifactsVerified':len(data),
               'artifactBytesVerified':sum(map(len,data.values())),
               'validationInputsDecodedVerified':verified_inputs,
               'correctedArtifactsCrossBound':len(overlay),
               'exactHistoricalReplayBindings':len(historical['inventory']),
               'strictOverlayCorrespondences':correspondences,
               'retainedRawPayloadsDecodedVerified':payloads,
               'meaning':'mechanical byte verification, no gate approval'}
    return manifest, data, summary


def emit(text, cursor, invocation, summary):
    if cursor < 0 or cursor > len(text):
        raise ValueError('cursor outside content')
    def body(end):
        command = 'python3 -B ' + shlex.quote(SELF) + ' ' + invocation + ' ' + str(end)
        value = {'verification':summary,'cursor':cursor,'next':end,'total':len(text),
                 'eof':end == len(text),'nextCommand':None if end == len(text) else command,
                 'text':text[cursor:end]}
        return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
    low, high = cursor, len(text)
    while low < high:
        middle = (low+high+1)//2
        if len(body(middle))+1 <= 4800:
            low = middle
        else:
            high = middle-1
    if low == cursor and cursor < len(text):
        raise ValueError('metadata exceeds budget')
    sys.stdout.buffer.write(body(low)+b'\n')


def main():
    mode, *args = sys.argv[1:]
    manifest, data, summary = materialize()
    if mode == 'tour':
        selection_name = str(pathlib.PurePosixPath(SELF).parent/'selection.json')
        selection = json.loads(load(selection_name))
        blocks, hashes = [], {}
        for name in selection['paths']:
            raw = data[name]
            digest = sha(raw)
            header = '\n\n=== '+name+' | SHA256 '+digest+' | bytes '+str(len(raw))+' ===\n'
            if digest in hashes:
                blocks.append(header+'Exact duplicate bytes already shown under '+hashes[digest]+'\n')
            else:
                hashes[digest] = name
                blocks.append(header+raw.decode('utf-8')+'\n=== END '+name+' ===\n')
        emit(''.join(blocks),int(args[0]),'tour',summary)
    elif mode == 'inventory':
        rows = [{**row,'fileId':i,'readCommand':'python3 -B '+shlex.quote(SELF)+' file '+str(i)+' 0'}
                for i,row in enumerate(manifest['artifacts'])]
        emit(json.dumps(rows,ensure_ascii=False,indent=2),int(args[0]),'inventory',summary)
    elif mode == 'file':
        file_id,cursor = map(int,args)
        name = manifest['artifacts'][file_id]['path']
        emit(data[name].decode('utf-8'),cursor,'file '+str(file_id),{**summary,'path':name,'sourceSha256':sha(data[name])})
    else:
        raise ValueError('unknown read operation')


if __name__ == '__main__':
    main()
