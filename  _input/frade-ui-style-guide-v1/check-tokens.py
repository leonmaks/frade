#!/usr/bin/env python3
"""Check token shape, generated CSS drift and named contrast pairs; not an app a11y audit."""
import json
import re
import sys
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('generator', ROOT / 'generate-tokens.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


def luminance(value):
    rgb = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(v * w for v, w in zip(linear, [0.2126, 0.7152, 0.0722]))


def ratio(a, b):
    x, y = sorted([luminance(a), luminance(b)])
    return (y + 0.05) / (x + 0.05)


def validate(data, css):
    errors, results = [], []
    if data['version'] != '1.0.0':
        errors.append('Guide/token version mismatch')
    sets = [set(v) for v in data['themes'].values()]
    if not all(s == sets[0] for s in sets):
        errors.append('Theme token sets differ')
    if css != generator.generate(data):
        errors.append('Generated CSS drift')
    surfaces = ['surface.base', 'surface.panel', 'surface.rail', 'surface.hover', 'surface.overlay']
    pairs = [(text, bg, 4.5) for text in ['text.primary','text.secondary'] for bg in surfaces]
    pairs += [('action.onPrimary', 'action.primary', 4.5), ('action.onPrimary','action.primaryHover',4.5),
              ('selection.fg','selection.bg',4.5),('text.secondary','selection.bg',4.5),
              ('text.primary','diagram.nodeBg',4.5)]
    pairs += [(f'status.{status}', f'status.{status}Bg', 4.5) for status in ['success','warning','error','info']]
    pairs += [(fg, bg, 3) for fg in ['focus.ring','border.control'] for bg in surfaces]
    pairs += [('diagram.nodeStroke','diagram.canvas',3),('diagram.nodeStroke','diagram.nodeBg',3),
              ('diagram.edge','diagram.canvas',3),('diagram.selection','diagram.nodeBg',3),
              ('focus.ring','selection.bg',3)]
    for theme, values in data['themes'].items():
        for key, value in values.items():
            if not re.fullmatch(r'#[0-9A-Fa-f]{6}', value):
                errors.append(f'{theme}: invalid color {key}')
        for fg, bg, threshold in pairs:
            contrast = ratio(values[fg], values[bg])
            results.append({'theme':theme,'foreground':fg,'background':bg,
                            'ratio':round(contrast,3),'minimum':threshold,
                            'pass':contrast >= threshold})
            if contrast < threshold:
                errors.append(f'{theme}: {fg} / {bg} = {contrast:.3f}, needs {threshold}')
    return errors, results


if __name__ == '__main__':
    data = json.loads((ROOT / 'tokens.json').read_text())
    errors, results = validate(data, (ROOT / 'tokens.css').read_text())
    report = {'status':'FAIL' if errors else 'PASS','scope':'Named token pairs and CSS drift only',
              'checks':len(results),'errors':errors,'contrast':results}
    if '--report' in sys.argv:
        (ROOT / 'token-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'status':report['status'],'checks':len(results),'errors':errors}))
    sys.exit(bool(errors))
