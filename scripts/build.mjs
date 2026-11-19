#!/usr/bin/env node
// KMT — génère tous les exports de tokens depuis tokens/tokens.json.
// Usage : node scripts/build.mjs   (aucune dépendance)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const T = JSON.parse(readFileSync(join(root, 'tokens/tokens.json'), 'utf8'))
const out = (p, s) => { const f = join(root, 'dist', p); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); console.log('  dist/' + p) }
const HEAD = (c = '//') => `${c} GÉNÉRÉ par scripts/build.mjs depuis tokens/tokens.json — ne pas éditer à la main.\n`

// ── Résolution des alias {color.or.500} ─────────────────────────────────────
const get = (path) => path.split('.').reduce((o, k) => o?.[k], T)
const val = (v) => (v && typeof v === 'object' && '$value' in v ? v.$value : v)
const resolve = (v) => {
  v = val(v)
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return resolve(get(v.slice(1, -1)))
  return v
}
const scale = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, resolve(v)]))

const primitives = {
  brand: scale(T.color.brand),
  neutre: scale(T.color.neutre), or: scale(T.color.or), nil: scale(T.color.nil),
  palmier: scale(T.color.palmier), terre: scale(T.color.terre),
}
const themes = { clair: scale(T.theme.clair), sombre: scale(T.theme.sombre) }
const fam = Object.fromEntries(Object.entries(T.font.family).map(([k, v]) => [k, v.$value]))

// ── 1. CSS custom properties ─────────────────────────────────────────────────
{
  const L = []
  L.push(HEAD('/*').replace('\n', ' */\n'))
  L.push(':root {')
  for (const [k, v] of Object.entries(primitives.brand)) L.push(`  --kmt-${k}: ${v};`)
  for (const name of ['neutre', 'or', 'nil', 'palmier', 'terre'])
    for (const [k, v] of Object.entries(primitives[name])) L.push(`  --kmt-${name}-${k}: ${v};`)
  for (const [k, v] of Object.entries(fam)) L.push(`  --kmt-font-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.font.size)) L.push(`  --kmt-text-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.font.weight)) L.push(`  --kmt-weight-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.font.leading)) L.push(`  --kmt-leading-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.font.tracking)) L.push(`  --kmt-tracking-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.space)) L.push(`  --kmt-space-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.radius)) if (!k.startsWith('$')) L.push(`  --kmt-radius-${k}: ${v};`)
  L.push(`  --kmt-joint: ${T.joint.$value};`)
  for (const [k, v] of Object.entries(T.shadow)) L.push(`  --kmt-shadow-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.motion.duration)) L.push(`  --kmt-duration-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.motion.easing)) L.push(`  --kmt-ease-${k}: ${v};`)
  for (const [k, v] of Object.entries(T.z)) L.push(`  --kmt-z-${k}: ${v};`)
  L.push(`  --kmt-container: ${T.layout.container};`, `  --kmt-gutter: ${T.layout.gutter};`)
  L.push('}', '')
  const block = (sel, th) => [`${sel} {`, ...Object.entries(th).map(([k, v]) => `  --kmt-${k}: ${v};`), `  color-scheme: ${th === themes.sombre ? 'dark' : 'light'};`, '}', '']
  L.push('/* Thème clair (défaut) */', ...block(':root, [data-theme="clair"], [data-theme="light"]', themes.clair))
  L.push('/* Thème sombre — posé par data-theme="sombre" sur <html> ou sur n\'importe quel conteneur */', ...block('[data-theme="sombre"], [data-theme="dark"]', themes.sombre))
  L.push('/* Thème auto — suit le système (data-theme="auto") */', '@media (prefers-color-scheme: dark) {', ...block('  [data-theme="auto"]', themes.sombre).map((l) => '  ' + l), '}', '')
  out('css/kmt-tokens.css', L.join('\n'))
}

// ── 2. JS / TS ───────────────────────────────────────────────────────────────
{
  const obj = {
    color: primitives, theme: themes, font: { family: fam, size: T.font.size, weight: T.font.weight, leading: T.font.leading, tracking: T.font.tracking },
    type: T.type, space: T.space, radius: T.radius, shadow: T.shadow, motion: T.motion, layout: T.layout, icon: T.icon, z: T.z,
  }
  out('js/kmt-tokens.mjs', HEAD() + `export const kmt = ${JSON.stringify(obj, null, 2)}\nexport default kmt\n`)
  out('js/kmt-tokens.json', JSON.stringify(obj, null, 2) + '\n')
  out('js/kmt-tokens.d.ts', HEAD() + `declare const kmt: typeof import('./kmt-tokens.json')\nexport { kmt }\nexport default kmt\n`)
}

// ── 3. Tailwind (v3 preset + v4 @theme) ──────────────────────────────────────
{
  const v = (k) => `var(--kmt-${k})`
  const semantic = Object.fromEntries(Object.keys(themes.clair).map((k) => [k, v(k)]))
  const preset = {
    theme: {
      extend: {
        colors: {
          kmt: { noir: primitives.brand['noir-kmt'], papyrus: primitives.brand.papyrus, or: primitives.brand['or-solaire'], nil: primitives.brand.nil, sable: primitives.brand.sable },
          neutre: primitives.neutre, or: primitives.or, nil: primitives.nil, palmier: primitives.palmier, terre: primitives.terre,
          ...semantic,
        },
        fontFamily: { display: fam.display.split(/,\s*/), sans: fam.body.split(/,\s*/), mono: fam.mono.split(/,\s*/) },
        borderRadius: { sm: T.radius.sm, DEFAULT: T.radius.md, md: T.radius.md, lg: T.radius.lg, pill: T.radius.pill },
        spacing: { joint: T.joint.$value },
        boxShadow: { card: T.shadow.card, raised: T.shadow.raised, overlay: T.shadow.overlay },
        transitionTimingFunction: { kmt: T.motion.easing.standard },
        letterSpacing: { label: T.font.tracking.label },
      },
    },
  }
  out('tailwind/kmt-preset.cjs', HEAD() + `// Tailwind v3 : presets: [require('@kmt/design-system/tailwind')] + importer dist/css/kmt-tokens.css\nmodule.exports = ${JSON.stringify(preset, null, 2)}\n`)
  const L = [HEAD('/*').replace('\n', ' */\n'), '/* Tailwind v4 : @import "tailwindcss"; @import "./kmt-tokens.css"; @import "./kmt-theme.css"; */', '@theme {']
  for (const [k, c] of Object.entries({ 'kmt-noir': primitives.brand['noir-kmt'], 'kmt-papyrus': primitives.brand.papyrus, 'kmt-or': primitives.brand['or-solaire'], 'kmt-nil': primitives.brand.nil, 'kmt-sable': primitives.brand.sable })) L.push(`  --color-${k}: ${c};`)
  for (const name of ['neutre', 'or', 'nil', 'palmier', 'terre']) for (const [k, c] of Object.entries(primitives[name])) L.push(`  --color-${name}-${k}: ${c};`)
  for (const k of Object.keys(themes.clair)) L.push(`  --color-${k}: var(--kmt-${k});`)
  L.push(`  --font-display: ${fam.display};`, `  --font-sans: ${fam.body};`, `  --font-mono: ${fam.mono};`)
  for (const [k, r] of Object.entries(T.radius)) if (!k.startsWith('$')) L.push(`  --radius-${k}: ${r};`)
  L.push(`  --spacing-joint: ${T.joint.$value};`)
  for (const [k, s] of Object.entries(T.shadow)) if (k !== 'none') L.push(`  --shadow-${k}: ${s};`)
  L.push('}', '')
  out('tailwind/kmt-theme.css', L.join('\n'))
}

// ── 4. Zeno — BrandConfig complet (core/brands/src/brands/kmt.ts) ────────────
{
  const c = themes.clair, t = T.type
  const font = (s) => `${s.weight} ${T.font.size[s.size]}/${s.leading} var(--font-${s.family === 'display' ? 'display' : s.family === 'mono' ? 'mono' : 'body'})`
  const tokens = {
    '--bg-page': c['bg-page'], '--bg-card': c['bg-card'], '--text-primary': c['text-primary'], '--text-inverse': c['text-inverse'],
    // Sans traits : les séparations deviennent invisibles, les champs gardent un fond.
    '--border-subtle': 'transparent', '--border-default': c['bg-field'], '--scrim': c.scrim,
    '--accent-primary': c['action-primary'], '--accent-soft': c['accent-soft'],
    '--tone-success': c.success, '--tone-success-soft': c['success-soft'], '--tone-warning': c.warning, '--tone-warning-soft': c['warning-soft'],
    '--tone-danger': c.danger, '--tone-danger-soft': c['danger-soft'], '--tone-info': c.info, '--tone-info-soft': c['info-soft'],
    '--font-display': fam.display, '--font-body': fam.body, '--font-mono': fam.mono,
    // Pas de bouton pilule chez KMT : le « pill » de Zeno (boutons) prend le rayon des blocs.
    '--radius-sm': T.radius.sm, '--radius-md': T.radius.md, '--radius-lg': T.radius.lg, '--radius-pill': T.radius.md,
    '--shadow-card': 'none', '--gradient-hero': primitives.brand['noir-kmt'],
    // Chrome de marque (barre latérale, bandeau des e-mails) : Noir KMT, texte Papyrus, actif en Or.
    '--surface-brand': primitives.brand['noir-kmt'], '--text-on-brand': primitives.brand.papyrus, '--accent-on-brand': primitives.brand['or-solaire'],
    '--text-on-accent': primitives.brand.papyrus,
    '--surface-muted': c['bg-muted'], '--surface-inverse': c['bg-card'], '--surface-glass': 'rgba(244, 238, 227, 0.10)', '--border-glass': 'rgba(244, 238, 227, 0.22)',
    '--h1-font': font(t.h1), '--h1-transform': 'none', '--h1-tracking': t.h1.tracking,
    '--h2-font': font(t.h2), '--h2-transform': 'none', '--h2-tracking': t.h2.tracking,
    '--h3-font': font(t.h3), '--h3-transform': 'none', '--h3-tracking': '0',
    '--body-lg-font': font(t['body-lg']), '--body-font': font(t.body), '--caption-font': font(t.caption), '--kpi-font': font(t.data),
    '--text-secondary': c['text-secondary'], '--text-muted': c['text-muted'], '--surface-subtle': c['bg-subtle'], '--border-strong': c['bg-field-hover'],
    '--shadow-raised': T.shadow.raised, '--shadow-overlay': T.shadow.overlay, '--tone-neutral': c.neutral, '--tone-neutral-soft': c['neutral-soft'],
    '--font-label': 'var(--font-mono)', '--label-weight': '500', '--label-transform': 'uppercase', '--label-tracking': T.font.tracking.label,
    '--title-cursor': 'none', '--font-data': 'var(--font-mono)',
  }
  const q = (s) => (String(s).includes("'") ? JSON.stringify(String(s)) : `'${s}'`)
  const body = Object.entries(tokens).map(([k, v]) => `    '${k}': ${q(v)},`).join('\n')
  out('zeno/kmt.ts', `import type { BrandConfig } from '../registry.js'

${HEAD()}//
// Fondation KMT — « le logiciel libre africain ». Design system KMT v${T.$version} :
// Papyrus / Noir KMT / Or Solaire / Nil, Space Grotesk + Manrope + JetBrains Mono,
// grammaire des blocs (rayons 3·6·10, écart de 3 px entre modules), sans traits : ni bordures ni filets, la structure vient
// de l'espace et des fonds. Ombres réservées aux surcouches (menus, modales).
// Remplace core/brands/src/brands/kmt.ts. Les polices se chargent via
// dist/fonts/kmt-fonts.css (ou @fontsource/space-grotesk, manrope, jetbrains-mono).
const kmt: BrandConfig = {
  id: 'kmt',
  label: 'KMT',
  mono: 'K',
  sitePlateforme: 'EDMS',
  tokens: {
${body}
  },
}

export default kmt
`)
}

// ── 5. EDMS — theme.json (même schéma que @edms/theme, importable par Zeno) ──
{
  const mk = (th, name) => ({
    name, colors: {
      // Nil en principale (boutons, liens), or en accent : l'or reste réservé au module actif.
      primary: primitives.brand.nil, secondary: primitives.brand.nil, accent: primitives.brand['or-solaire'],
      background: th['bg-page'], text: th['text-primary'], muted: th['text-muted'], border: th['border-default'].startsWith('#') ? th['border-default'] : primitives.neutre['700'],
      onPrimary: primitives.brand.papyrus,
    },
    typography: { heading: 'Space Grotesk', body: 'Manrope', mono: 'JetBrains Mono' },
    radius: T.radius, logo: '/brand/kmt-lockup-sur-clair.svg',
  })
  out('edms/theme.json', JSON.stringify(mk(themes.clair, 'KMT'), null, 2) + '\n')
  out('edms/theme-sombre.json', JSON.stringify({ ...mk(themes.sombre, 'KMT — sombre'), logo: '/brand/kmt-lockup-sur-sombre.svg' }, null, 2) + '\n')
}

// ── 6. Charte documentaire Zeno (modules/rh — contrats, factures) ────────────
out('documents/charte-kmt.json', JSON.stringify({
  nom: 'KMT',
  couleurs: { primaire: '#c9993b', sombre: '#16130f', surSombre: '#f4eee3', texte: '#16130f', discret: '#5e574d', filet: '#d8cfbd', accent: '#2e5a5c' },
  polices: { titre: 'Space Grotesk', texte: 'Manrope' },
  accroche: 'Fondation open source · Abidjan',
  slogan: "Le logiciel libre, construit en Afrique, pour l'Afrique.",
  couverture: true,
}, null, 2) + '\n')

// ── 7. Terminal & CLI ────────────────────────────────────────────────────────
{
  const ansi = {
    background: '#16130F', foreground: '#F4EEE3', cursor: '#C9993B', selection: '#4A3B1E',
    black: '#16130F', red: '#E8826B', green: '#7DBE8A', yellow: '#DDB561', blue: '#6B9C9C', magenta: '#B98AA6', cyan: '#9CBFBE', white: '#D8CFBD',
    brightBlack: '#5E574D', brightRed: '#F0A08D', brightGreen: '#9FD3AA', brightYellow: '#EBCF8E', brightBlue: '#9CBFBE', brightMagenta: '#D3AEC2', brightCyan: '#CCDEDD', brightWhite: '#F4EEE3',
  }
  const order = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
  out('terminal/ghostty-kmt', HEAD('#') + order.map((k, i) => `palette = ${i}=${ansi[k]}`).join('\n') + `\nbackground = ${ansi.background}\nforeground = ${ansi.foreground}\ncursor-color = ${ansi.cursor}\nselection-background = ${ansi.selection}\nselection-foreground = ${ansi.foreground}\nfont-family = JetBrains Mono\n`)
  out('terminal/windows-terminal-kmt.json', JSON.stringify({ name: 'KMT', ...Object.fromEntries(Object.entries(ansi).map(([k, v]) => [k === 'selection' ? 'selectionBackground' : k === 'cursor' ? 'cursorColor' : k === 'magenta' ? 'purple' : k === 'brightMagenta' ? 'brightPurple' : k, v])) }, null, 2) + '\n')
  out('terminal/alacritty-kmt.toml', HEAD('#') + `[colors.primary]\nbackground = "${ansi.background}"\nforeground = "${ansi.foreground}"\n\n[colors.cursor]\ncursor = "${ansi.cursor}"\ntext = "${ansi.background}"\n\n[colors.selection]\nbackground = "${ansi.selection}"\ntext = "${ansi.foreground}"\n\n[colors.normal]\n` + order.slice(0, 8).map((k) => `${k} = "${ansi[k]}"`).join('\n') + '\n\n[colors.bright]\n' + order.slice(8).map((k) => `${k.replace('bright', '').toLowerCase()} = "${ansi[k]}"`).join('\n') + '\n')
  const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const it = (name, h) => { const [r, g, b] = hex2(h); return `\t<key>${name}</key>\n\t<dict>\n\t\t<key>Color Space</key><string>sRGB</string>\n\t\t<key>Red Component</key><real>${r}</real>\n\t\t<key>Green Component</key><real>${g}</real>\n\t\t<key>Blue Component</key><real>${b}</real>\n\t</dict>` }
  out('terminal/KMT.itermcolors', `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n` + [...order.map((k, i) => it(`Ansi ${i} Color`, ansi[k])), it('Background Color', ansi.background), it('Foreground Color', ansi.foreground), it('Cursor Color', ansi.cursor), it('Cursor Text Color', ansi.background), it('Selection Color', ansi.selection), it('Selected Text Color', ansi.foreground), it('Bold Color', ansi.brightWhite)].join('\n') + '\n</dict>\n</plist>\n')
  out('terminal/kmt-cli.mjs', HEAD() + `// Palette et habillage des CLI KMT (zeno, edms, devpanel…). Zéro dépendance : séquences ANSI truecolor.
// import { kmt } from './kmt-cli.mjs';  console.log(kmt.banner('zeno', '2.4.0')); console.log(kmt.ok('Déployé'))
const NO = !!process.env.NO_COLOR || !process.stdout.isTTY
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const fg = (h) => (s) => (NO ? s : \`\\x1b[38;2;\${rgb(h).join(';')}m\${s}\\x1b[39m\`)
const bold = (s) => (NO ? s : \`\\x1b[1m\${s}\\x1b[22m\`)
const dim = (s) => (NO ? s : \`\\x1b[2m\${s}\\x1b[22m\`)
export const colors = ${JSON.stringify({ or: '#C9993B', papyrus: '#F4EEE3', sable: '#D8CFBD', nil: '#9CBFBE', succes: '#7DBE8A', attention: '#DDB561', erreur: '#E8826B', discret: '#9A9081' }, null, 2)}
const or = fg(colors.or), pap = fg(colors.papyrus), nil = fg(colors.nil), ok = fg(colors.succes), warn = fg(colors.attention), err = fg(colors.erreur), mute = fg(colors.discret)
// Le symbole KMT en 3 lignes (blocs Unicode) — même géométrie que le logo.
const SYMBOLE = ['█  ██', '█ ██ ', '█  ██']
export const kmt = {
  or, papyrus: pap, nil, discret: mute, bold, dim,
  symbole: () => SYMBOLE.map(or).join('\\n'),
  banner: (produit, version = '') => SYMBOLE.map((l, i) => or(l) + '   ' + [bold(pap(produit)), mute(version ? 'v' + version : ''), mute('openkmt.org')][i]).join('\\n') + '\\n',
  label: (s) => mute(s.toUpperCase().split('').join(' ')),
  ok: (s) => ok('✓') + ' ' + s,
  info: (s) => nil('›') + ' ' + s,
  warn: (s) => warn('!') + ' ' + s,
  err: (s) => err('✕') + ' ' + s,
  step: (n, total, s) => mute(\`[\${n}/\${total}]\`) + ' ' + s,
  cmd: (s) => or('$ ') + pap(s),
  kv: (k, v) => mute(k.padEnd(14)) + ' ' + pap(v),
}
export default kmt
`)
}

console.log('Tokens KMT générés.')
