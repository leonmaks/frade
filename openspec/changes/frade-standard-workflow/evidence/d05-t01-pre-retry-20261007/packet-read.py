"""Read-only review preparation aid. No verdict, authority or production capability."""
import base64
import hashlib
import json
import pathlib
import sys

LIMIT = 4800


def regular(name):
    root = pathlib.Path.cwd().resolve()
    p = root / name
    if pathlib.Path(name).is_absolute() or '..' in pathlib.Path(name).parts:
        raise ValueError('packet-relative regular path required')
    for part in [p, *p.parents]:
        if part == root:
            break
        if part.is_symlink():
            raise ValueError('symlink unavailable')
    p.resolve().relative_to(root)
    if not p.is_file():
        raise ValueError('regular file required')
    return p.read_bytes()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def page(text, cursor, label, source_hash):
    if cursor < 0 or cursor > len(text):
        raise ValueError('cursor outside content')
    def encoded(end):
        return json.dumps({'label': label, 'sourceSha256': source_hash,
                           'cursor': cursor, 'next': end, 'total': len(text),
                           'eof': end == len(text),
                           'firstLine': text.count('\n', 0, cursor) + 1,
                           'lastLine': text.count('\n', 0, end) + 1,
                           'text': text[cursor:end]}, ensure_ascii=False,
                          separators=(',', ':')).encode('utf-8')
    low, high = cursor, len(text)
    while low < high:
        middle = (low + high + 1) // 2
        if len(encoded(middle)) + 1 <= LIMIT:
            low = middle
        else:
            high = middle - 1
    if low == cursor and cursor < len(text):
        raise ValueError('metadata exceeds output budget')
    sys.stdout.buffer.write(encoded(low) + b'\n')


def main(args):
    mode, name, *rest = args
    raw = regular(name)
    if mode == 'text':
        page(raw.decode('utf-8'), int(rest[0]), name, digest(raw))
    elif mode == 'json':
        value = json.loads(raw)
        pointer, cursor = rest
        for segment in pointer.split('/'):
            if not segment:
                continue
            if segment == '!':
                value = json.loads(value)
            else:
                segment = segment.replace('~1', '/').replace('~0', '~')
                value = value[int(segment)] if isinstance(value, list) else value[segment]
        page(json.dumps(value, ensure_ascii=False, indent=2), int(cursor),
             name + '#' + pointer, digest(raw))
    elif mode == 'verify-inputs':
        value = json.loads(raw)
        seen, count, size, overlays = set(), 0, 0, []
        for item in value['inputs']:
            if item['path'] in seen:
                raise ValueError('duplicate input')
            seen.add(item['path'])
            data = base64.b64decode(item['data'], validate=True)
            if len(data) != item['bytes'] or digest(data) != item['sha256']:
                raise ValueError('validation input mismatch: ' + item['path'])
            count += 1
            size += len(data)
            if item['correctedOverlay']:
                overlays.append({k: v for k, v in item.items() if k != 'data'})
        result = {'verifiedInputs': count, 'verifiedBytes': size, 'overlays': overlays}
        page(json.dumps(result, ensure_ascii=False, indent=2), int(rest[0]), name,
             digest(raw))
    elif mode == 'inventory':
        value = json.loads(raw)
        items = value.get('artifacts', value.get('inputs'))
        result = [{k: v for k, v in item.items() if k != 'data'} for item in items]
        page(json.dumps(result, ensure_ascii=False, indent=2), int(rest[0]), name,
             digest(raw))
    else:
        raise ValueError('unknown read operation')


if __name__ == '__main__':
    main(sys.argv[1:])
