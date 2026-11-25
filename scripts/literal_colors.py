"""Resolve sRGB palette formulas without rounding intermediate channels."""
import math
import re


def literal_palette(tokens, primitives=None):
    values = {**(primitives or {}), **tokens}
    cache = {}

    def color(value, stack=()):
        value = value.strip()
        ref = re.fullmatch(r'var\((--[\w-]+)\)', value)
        if ref:
            key = ref[1]
            if key in stack:
                raise ValueError(f'Circular color reference: {key}')
            if key not in cache:
                cache[key] = color(values[key], (*stack, key))
            return cache[key]
        if value in ('white', 'black', 'transparent'):
            return {'white': (255, 255, 255, 1), 'black': (0, 0, 0, 1), 'transparent': (0, 0, 0, 0)}[value]
        if value.startswith('#'):
            h = value[1:]
            if len(h) in (3, 4): h = ''.join(x * 2 for x in h)
            return (*[int(h[i:i+2], 16) for i in (0, 2, 4)], int(h[6:8], 16)/255 if len(h) == 8 else 1)
        if value.startswith(('rgb(', 'rgba(')):
            parts = [float(x.strip()) for x in value[value.index('(')+1:-1].split(',')]
            return tuple(parts if len(parts) == 4 else [*parts, 1])
        match = re.fullmatch(r'color-mix\(in srgb, (.+) ([\d.]+)%, (.+)\)', value)
        if not match: raise ValueError(f'Unsupported color: {value}')
        a, b = color(match[1], stack), color(match[3], stack)
        w = float(match[2])/100
        alpha = a[3]*w + b[3]*(1-w)
        return (*[(a[i]*a[3]*w + b[i]*b[3]*(1-w))/alpha if alpha else 0 for i in range(3)], alpha)

    def css(rgba):
        r, g, b = [math.floor(x + .5) for x in rgba[:3]]
        return f'#{r:02X}{g:02X}{b:02X}' if rgba[3] >= 1-1e-12 else f'rgba({r}, {g}, {b}, {rgba[3]:.6g})'

    result = {}
    for key, value in tokens.items():
        if key.startswith('--theme-color-'):
            result[key] = css(color(value)) if 'color-mix(' in value or 'var(' in value else value
        elif 'gradient' in key:
            result[key] = re.sub(r'var\((--[\w-]+)\)', lambda m: css(color(m[0])), value)
        else:
            result[key] = value
    return result
