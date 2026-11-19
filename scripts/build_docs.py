#!/usr/bin/env python3
"""Assemble le site de documentation KMT (docs/src/index.html → docs/index.html autonome).

Usage : python3 scripts/build_docs.py [--google-fonts]
  Par défaut les polices sont embarquées en base64 (fichier 100 % autonome, hors-ligne).
"""
import base64, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from icons import ICONS, svg as icon  # noqa: E402

T = json.loads((ROOT / 'tokens/tokens.json').read_text())
src = (ROOT / 'docs/src/index.html').read_text()


def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    a, b = lum(a), lum(b); return (max(a, b) + .05) / (min(a, b) + .05)


def res(v):
    v = v['$value'] if isinstance(v, dict) and '$value' in v else v
    if isinstance(v, str) and v.startswith('{'):
        o = T
        for k in v[1:-1].split('.'): o = o[k]
        return res(o)
    return v


def inline_svg(path):
    s = (ROOT / path).read_text()
    s = re.sub(r'<svg([^>]*?) width="[^"]+" height="[^"]+"', r'<svg\1', s, count=1)
    s = re.sub(r'<title>.*?</title>', '', s)
    return s.strip()


# Échelles
ramps = []
for name in ['neutre', 'or', 'nil']:
    steps = [k for k in T['color'][name] if not k.startswith('$') and k not in ('0', '25', '850')][:10]
    cells = ''
    for k in steps:
        h = res(T['color'][name][k]); fg = '#16130F' if lum(h) > .25 else '#F4EEE3'
        cells += f'<div style="background:{h};color:{fg}" title="{name}-{k} {h}">{k}</div>'
    ramps.append(f'<div class="ramp"><span>{name}</span>{cells}</div>')

# Rôles
ROLES = [('text-primary', 'Texte principal', 'bg-page'), ('text-secondary', 'Texte secondaire', 'bg-card'), ('text-muted', 'Texte discret, légendes', 'bg-page'),
         ('text-link', 'Liens', 'bg-card'), ('text-gold', "Labels or, chiffres mis en avant", 'bg-card'), ('action-primary', 'Bouton principal', None),
         ('action-brand', 'Bouton de marque', None), ('success', 'Succès', 'bg-card'), ('warning', 'Attention', 'bg-card'), ('danger', 'Erreur', 'bg-card'), ('info', 'Information', 'bg-card')]
rows = ''
for role, use, bg in ROLES:
    c, d = res(T['theme']['clair'][role]), res(T['theme']['sombre'][role])
    sw = lambda h: f'<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:{h};vertical-align:-2px;margin-right:8px;border:1px solid rgba(0,0,0,.1)"></span>{h}'
    if bg:
        r1 = ratio(c, res(T['theme']['clair'][bg])); r2 = ratio(d, res(T['theme']['sombre'][bg]))
    else:
        r1 = ratio(c, res(T['theme']['clair']['on-' + role])); r2 = ratio(d, res(T['theme']['sombre']['on-' + role]))
    ok = lambda r: f'<span class="kmt-badge kmt-badge--{"success" if r >= 4.5 else "warning"}">{r:.1f}:1 {"AA" if r >= 4.5 else "AA large"}</span>'
    rows += f'<tr><td class="kmt-data" style="font-size:12px">--kmt-{role}</td><td class="kmt-text">{use}</td><td>{sw(c)}</td><td>{sw(d)}</td><td><div class="kmt-row" style="gap:6px">{ok(r1)}{ok(r2)}</div></td></tr>'

spaces = ''.join(f'<div><div style="width:{v};height:{v};min-width:2px;background:var(--kmt-or-500);border-radius:2px"></div><span class="kmt-label">{k} · {v.replace("px","")}</span></div>' for k, v in T['space'].items() if k != '0')
iconsgrid = ''.join(f'<div>{icon(n)}<span>{n}</span></div>' for n in ICONS)

DOCS = [('Lettre', 'Papier à en-tête', 'lettre'), ('Facture', 'FAC-2026-016', 'facture'), ('Devis', 'DEV-2026-031', 'devis'), ('Contrat', 'Prestation de services', 'contrat'),
        ('Attestation', 'De contribution', 'attestation'), ('Procès-verbal', 'Réunion du bureau', 'proces-verbal'), ('Carte de visite', '85 × 55 mm', 'carte-de-visite'), ('E-mail', 'Transactionnel & signature', 'email')]
doccards = ''.join(f'<div class="kmt-card kmt-card--interactive"><span class="kmt-eyebrow">{a}</span><h3 class="kmt-card__title" style="margin:10px 0 6px;font-size:16px">{b}</h3><p class="kmt-caption">modèle privé · kmt-docs/Marque/documents/{c}.html</p></div>' for a, b, c in DOCS)

# Polices embarquées
fonts_css = ''
for f in sorted((ROOT / 'fonts').glob('*.woff2')):
    m = re.match(r'(.+)-latin-(\d+)-normal', f.stem)
    fam = {'space-grotesk': 'Space Grotesk', 'manrope': 'Manrope', 'jetbrains-mono': 'JetBrains Mono'}[m.group(1)]
    b64 = base64.b64encode(f.read_bytes()).decode()
    fonts_css += f"@font-face{{font-family:'{fam}';font-weight:{m.group(2)};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2')}}\n"

out = src
out = re.sub(r'<link rel="preconnect"[^\n]*\n<link href="https://fonts[^\n]*\n', '' if '--google-fonts' not in sys.argv else r'\g<0>', out)
out = out.replace('<style>{{css:dist/css/kmt-tokens.css}}</style>', ('' if '--google-fonts' in sys.argv else f'<style>{fonts_css}</style>\n') + '<style>{{css:dist/css/kmt-tokens.css}}</style>')
out = re.sub(r'\{\{css:([^}]+)\}\}', lambda m: (ROOT / m.group(1)).read_text(), out)
out = re.sub(r'\{\{svg:([^}]+)\}\}', lambda m: inline_svg(m.group(1)), out)
out = re.sub(r'\{\{i:([a-z-]+)\}\}', lambda m: icon(m.group(1)), out)
for k, v in {'ramps': '\n'.join(ramps), 'roles': rows, 'spaces': spaces, 'iconsgrid': iconsgrid, 'doccards': doccards}.items():
    out = out.replace('{{' + k + '}}', v)
assert '{{' not in out, re.findall(r'\{\{[^}]+\}\}', out)[:5]
dest = ROOT / 'docs/index.html'
dest.write_text(out)
print(f'docs/index.html — {len(out) // 1024} Ko')
