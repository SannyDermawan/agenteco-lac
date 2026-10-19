// govern stage, part 1: the dependency licenses.
// Reads the license field that npm records for every package in each lockfile, so nothing has to be installed.
import { existsSync, readFileSync } from 'node:fs'
import { writeReport, fail } from './lib.mjs'

const LOCKFILES = ['package-lock.json', 'agent-runtime/package-lock.json', 'backend/package-lock.json', 'frontend/package-lock.json', 'cli/package-lock.json', 'seller-agent/package-lock.json']
// Permissive licenses are fine. Copyleft that would bind a closed distribution needs a human decision.
const ALLOWED = /^(MIT|MIT-0|ISC|BSD-2-Clause|BSD-3-Clause|0BSD|Apache-2\.0|BlueOak-1\.0\.0|CC0-1\.0|CC-BY-4\.0|Unlicense|Python-2\.0|WTFPL|Zlib|MPL-2\.0|EPL-2\.0|LGPL-3\.0-or-later|LGPL-2\.1-or-later|OFL-1\.1)$/
const BLOCKED = /(AGPL|SSPL|GPL-[23])/ // plain GPL/AGPL/SSPL

function licenseOf(entry) {
  const raw = entry.license ?? entry.licenses
  if (!raw) return 'UNKNOWN'
  return typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((l) => l.type ?? l).join(' OR ') : String(raw.type ?? 'UNKNOWN')
}

function atoms(expression) {
  return expression.replace(/[()]/g, ' ').split(/\s+(?:OR|AND)\s+/i).map((s) => s.trim()).filter(Boolean)
}

const counts = {}
const review = []
let packages = 0
for (const file of LOCKFILES) {
  if (!existsSync(file)) continue
  const lock = JSON.parse(readFileSync(file, 'utf8'))
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    if (!path) continue
    packages += 1
    const expr = licenseOf(entry)
    counts[expr] = (counts[expr] ?? 0) + 1
    const parts = atoms(expr)
    // A dual license is acceptable if at least one alternative is allowed (OR). AND needs all of them.
    const ok = / AND /i.test(expr) ? parts.every((p) => ALLOWED.test(p)) : parts.some((p) => ALLOWED.test(p))
    if (!ok) review.push({ lockfile: file, package: path.replace(/^.*node_modules\//, ''), license: expr, blocked: BLOCKED.test(expr) })
  }
}

const projectLicense = existsSync('LICENSE') ? readFileSync('LICENSE', 'utf8') : ''
const mit = /MIT License/i.test(projectLicense)
const blocked = review.filter((r) => r.blocked)
const report = writeReport('licenses', {
  stage: 'govern',
  ok: mit && blocked.length === 0,
  summary: `${packages} packages across ${LOCKFILES.filter(existsSync).length} lockfiles, project license ${mit ? 'MIT' : 'MISSING'}, ${review.length} need review, ${blocked.length} blocked`,
  projectLicense: mit ? 'MIT' : 'missing',
  counts: Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)),
  needsReview: review.slice(0, 25),
})
console.log(report.summary)
if (!mit) fail('LICENSE is missing or is not the MIT license.')
for (const b of blocked) fail(`Blocked license ${b.license}: ${b.package} (${b.lockfile})`)
for (const r of review.filter((x) => !x.blocked).slice(0, 10)) console.log(`review: ${r.package} ${r.license}`)
