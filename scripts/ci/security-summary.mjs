// secure stage: turns the GitLab scanner reports into one short summary that the Duo security flow and the status site read.
import { existsSync, writeFileSync } from 'node:fs'
import { readJson, writeReport } from './lib.mjs'

const SOURCES = [
  { name: 'SAST', file: 'gl-sast-report.json' },
  { name: 'Secret detection', file: 'gl-secret-detection-report.json' },
  { name: 'Dependency scanning', file: 'gl-dependency-scanning-report.json' },
]
const ORDER = ['Critical', 'High', 'Medium', 'Low', 'Info', 'Unknown']

const scanners = []
for (const source of SOURCES) {
  if (!existsSync(source.file)) {
    scanners.push({ name: source.name, ran: false, counts: {}, top: [] })
    continue
  }
  const vulns = readJson(source.file, { vulnerabilities: [] }).vulnerabilities ?? []
  const counts = {}
  for (const v of vulns) counts[v.severity ?? 'Unknown'] = (counts[v.severity ?? 'Unknown'] ?? 0) + 1
  const top = vulns
    .slice()
    .sort((a, b) => ORDER.indexOf(a.severity ?? 'Unknown') - ORDER.indexOf(b.severity ?? 'Unknown'))
    .slice(0, 5)
    .map((v) => ({ severity: v.severity, name: v.name, file: v.location?.file, line: v.location?.start_line }))
  scanners.push({ name: source.name, ran: true, total: vulns.length, counts, top })
}

const ran = scanners.filter((s) => s.ran)
const lines = ['# Security findings summary', '']
for (const s of scanners) {
  if (!s.ran) {
    lines.push(`- ${s.name}: no report in this pipeline (scanner did not run or produced no artifact)`)
    continue
  }
  const detail = ORDER.filter((k) => s.counts[k]).map((k) => `${s.counts[k]} ${k}`).join(', ') || 'no findings'
  lines.push(`- ${s.name}: ${s.total} findings (${detail})`)
  for (const t of s.top) lines.push(`  - ${t.severity}: ${t.name} (${t.file ?? 'n/a'}${t.line ? `:${t.line}` : ''})`)
}
writeFileSync('reports/security-summary.md', lines.join('\n') + '\n')
const critical = ran.reduce((n, s) => n + (s.counts.Critical ?? 0), 0)
const high = ran.reduce((n, s) => n + (s.counts.High ?? 0), 0)
writeReport('security', {
  stage: 'secure',
  ok: critical === 0,
  summary: ran.length ? `${ran.length} scanners reported; ${critical} critical, ${high} high` : 'No scanner reports were available in this pipeline',
  scanners,
})
console.log(lines.join('\n'))
if (critical > 0) {
  console.error(`${critical} critical findings. Ask the AgentEco security reviewer flow to explain and propose fixes.`)
  process.exitCode = 1
}
