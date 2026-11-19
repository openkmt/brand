// GÉNÉRÉ par scripts/build.mjs depuis tokens/tokens.json — ne pas éditer à la main.
// Palette et habillage des CLI KMT (zeno, edms, devpanel…). Zéro dépendance : séquences ANSI truecolor.
// import { kmt } from './kmt-cli.mjs';  console.log(kmt.banner('zeno', '2.4.0')); console.log(kmt.ok('Déployé'))
const NO = !!process.env.NO_COLOR || !process.stdout.isTTY
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const fg = (h) => (s) => (NO ? s : `\x1b[38;2;${rgb(h).join(';')}m${s}\x1b[39m`)
const bold = (s) => (NO ? s : `\x1b[1m${s}\x1b[22m`)
const dim = (s) => (NO ? s : `\x1b[2m${s}\x1b[22m`)
export const colors = {
  "or": "#C9993B",
  "papyrus": "#F4EEE3",
  "sable": "#D8CFBD",
  "nil": "#9CBFBE",
  "succes": "#7DBE8A",
  "attention": "#DDB561",
  "erreur": "#E8826B",
  "discret": "#9A9081"
}
const or = fg(colors.or), pap = fg(colors.papyrus), nil = fg(colors.nil), ok = fg(colors.succes), warn = fg(colors.attention), err = fg(colors.erreur), mute = fg(colors.discret)
// Le symbole KMT en 3 lignes (blocs Unicode) — même géométrie que le logo.
const SYMBOLE = ['█  ██', '█ ██ ', '█  ██']
export const kmt = {
  or, papyrus: pap, nil, discret: mute, bold, dim,
  symbole: () => SYMBOLE.map(or).join('\n'),
  banner: (produit, version = '') => SYMBOLE.map((l, i) => or(l) + '   ' + [bold(pap(produit)), mute(version ? 'v' + version : ''), mute('openkmt.org')][i]).join('\n') + '\n',
  label: (s) => mute(s.toUpperCase().split('').join(' ')),
  ok: (s) => ok('✓') + ' ' + s,
  info: (s) => nil('›') + ' ' + s,
  warn: (s) => warn('!') + ' ' + s,
  err: (s) => err('✕') + ' ' + s,
  step: (n, total, s) => mute(`[${n}/${total}]`) + ' ' + s,
  cmd: (s) => or('$ ') + pap(s),
  kv: (k, v) => mute(k.padEnd(14)) + ' ' + pap(v),
}
export default kmt
