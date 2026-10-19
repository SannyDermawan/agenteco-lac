// monitor stage: checks that the things this project ships are alive, read-only.
// On failure it opens (or comments on) one incident issue, so a human sees it without reading pipeline logs.
import { writeReport } from './lib.mjs'

const TARGETS = [
  { name: 'AgentEco API /health', url: `${process.env.AGENTECO_API_URL ?? 'https://agenteco-multichain-production.up.railway.app'}/health` },
  { name: 'AgentEco website', url: 'https://agenteco.web.id' },
]
if (process.env.CI_PAGES_URL) TARGETS.push({ name: 'Status site (GitLab Pages)', url: process.env.CI_PAGES_URL })

async function probe(target) {
  const started = Date.now()
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(target.url, { signal: AbortSignal.timeout(15_000), redirect: 'follow' })
      if (res.ok) return { ...target, ok: true, status: res.status, ms: Date.now() - started, attempts: attempt }
      if (attempt === 3) return { ...target, ok: false, status: res.status, ms: Date.now() - started, attempts: attempt }
    } catch (err) {
      if (attempt === 3) return { ...target, ok: false, error: String(err.message ?? err), ms: Date.now() - started, attempts: attempt }
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
}

async function openIncident(failures) {
  const token = process.env.GITLAB_API_TOKEN // a project access token with the api scope, set by the maintainer
  const api = process.env.CI_API_V4_URL
  const project = process.env.CI_PROJECT_ID
  if (!token || !api || !project) {
    console.log('GITLAB_API_TOKEN is not set, so no incident issue is opened. Failures are in the job log and reports/health.json.')
    return null
  }
  const headers = { 'PRIVATE-TOKEN': token, 'content-type': 'application/json' }
  const title = 'Incident: health check failing'
  const description = `${failures.map((f) => `- ${f.name}: ${f.url} (${f.status ?? f.error})`).join('\n')}\n\nPipeline: ${process.env.CI_PIPELINE_URL ?? ''}`
  const found = await fetch(`${api}/projects/${project}/issues?state=opened&labels=incident&search=${encodeURIComponent(title)}`, { headers }).then((r) => r.json())
  if (Array.isArray(found) && found.length) {
    await fetch(`${api}/projects/${project}/issues/${found[0].iid}/notes`, { method: 'POST', headers, body: JSON.stringify({ body: description }) })
    return found[0].web_url
  }
  const created = await fetch(`${api}/projects/${project}/issues`, { method: 'POST', headers, body: JSON.stringify({ title, description, labels: 'incident' }) }).then((r) => r.json())
  return created.web_url ?? null
}

const results = await Promise.all(TARGETS.map(probe))
const failures = results.filter((r) => !r.ok)
const incident = failures.length ? await openIncident(failures) : null
const report = writeReport('health', {
  stage: 'monitor',
  ok: failures.length === 0,
  summary: failures.length ? `${failures.length} of ${results.length} checks failing` : `${results.length} of ${results.length} checks healthy`,
  results,
  incident,
})
console.log(report.summary)
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name} ${r.status ?? r.error ?? ''} ${r.ms}ms`)
if (failures.length) process.exitCode = 1
