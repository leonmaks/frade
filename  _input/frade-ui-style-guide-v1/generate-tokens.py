#!/usr/bin/env python3
"""Generate CSS from Frade's simple semantic-token JSON. Python standard library."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def css_name(key):
    return '--frade-' + key.replace('.', '-').replace('_', '-')


def block(selector, values):
    return selector + ' {\n' + ''.join(
        '  ' + css_name(key) + ': ' + value + ';\n' for key, value in values.items()
    ) + '}\n'


def generate(data):
    css = '/* Generated from tokens.json; do not edit. Frade UI v' + data['version'] + ' */\n'
    css += block(':root', {**data['common'], **data['density']['compact'], **data['themes']['light']})
    for theme, values in data['themes'].items():
        css += block('[data-frade-theme="' + theme + '"]', values)
    css += '@media (prefers-color-scheme: dark) {\n'
    css += block(':root:not([data-frade-theme]), [data-frade-theme="system"]', data['themes']['dark']) + '}\n'
    css += block('[data-frade-theme="system"]', {})
    for density, values in data['density'].items():
        css += block('[data-frade-density="' + density + '"]', values)
    css += '@media (pointer: coarse) {\n' + block(':root', {
        'size.target':'44px', 'size.control':'44px', 'size.row':'44px'
    }) + '}\n'
    # Local comfortable selectors must not override the coarse-pointer minimum.
    css += '@media (pointer: coarse) {\n' + block('[data-frade-density]', {
        'size.target':'44px', 'size.control':'44px', 'size.row':'44px'
    }) + '}\n'
    css += '@media (prefers-reduced-motion: reduce) {\n' + block(':root', {
        'motion.fast':'0ms', 'motion.overlay':'0ms'
    }) + '}\n'
    forced = {key:'CanvasText' for key in data['themes']['light']}
    for key in forced:
        if key.startswith('surface.') or key.endswith('Bg') or key in ('diagram.canvas','diagram.nodeBg'):
            forced[key] = 'Canvas'
    forced.update({'action.primary':'Highlight','action.primaryHover':'Highlight',
                   'action.onPrimary':'HighlightText','selection.bg':'Highlight',
                   'selection.fg':'HighlightText','selection.indicator':'Highlight',
                   'focus.ring':'Highlight','diagram.selection':'Highlight'})
    css += '@media (forced-colors: active) {\n' + block(':root, [data-frade-theme]', forced) + '}\n'
    return css


if __name__ == '__main__':
    data = json.loads((ROOT / 'tokens.json').read_text())
    (ROOT / 'tokens.css').write_text(generate(data))
    print('Generated tokens.css')
