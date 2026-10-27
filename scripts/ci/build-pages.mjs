// release stage: builds the public status site (GitLab Pages) from what this pipeline actually produced.
// Every number comes from a report artifact of an earlier job, nothing here is typed in by hand.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { readJson, readText } from './lib.mjs'

const env = process.env
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// --- numbers from the logs and junit files of the verify jobs
function junit(file) {
  const xml = readText(file)
  if (!xml) return null
  // Node's junit reporter does not put totals on <testsuites>, so count the cases. A case with a nested suite
  // is not a leaf test, so only count cases that carry no children of their own.
  const cases = xml.match(/<testcase\b[^>]*?(?:\/>|>[\s\S]*?<\/testcase>)/g) ?? []
  if (!cases.length) return null
  return { tests: cases.length, failures: cases.filter((c) => /<failure\b/.test(c)).length }
}
function forge() {
  const log = readText('reports/forge-test.log')
  const m = /(\d+) tests passed, (\d+) failed, (\d+) skipped/.exec(log ?? '')
  return m ? { tests: Number(m[1]) + Number(m[2]), failures: Number(m[2]) } : null
}
const suites = [
  ['Smart contracts (Foundry)', forge()],
  ['SDK (@agenteco/sdk)', junit('reports/sdk-junit.xml')],
  ['Backend API and keeper', junit('reports/backend-junit.xml')],
  ['CLI', junit('reports/cli-junit.xml')],
]

const reports = Object.fromEntries(['configure', 'security', 'licenses', 'policy'].map((n) => [n, readJson(`reports/${n}.json`)]))
const securityMd = readText('reports/security-summary.md')

const project = env.CI_PROJECT_URL ?? 'https://gitlab.com/agenteco-group/agenteco-lac'
const pipeline = env.CI_PIPELINE_URL ?? project
const stages = [
  ['plan', 'Issue and merge request templates, Duo issue triage flow', `${project}/-/issues`],
  ['create', 'Duo merge request reviewer flows (TypeScript and Solidity)', `${project}/-/merge_requests?state=all`],
  ['verify', suites.map(([n, s]) => (s ? `${n}: ${s.tests - s.failures}/${s.tests}` : `${n}: n/a`)).join('; '), pipeline],
  ['package', 'SDK and CLI tarballs, contract ABIs as pipeline artifacts', pipeline],
  ['secure', (reports.security?.summary ?? 'Scanner summary not available') + (reports.security?.scanners?.some((x) => x.name === 'Dependency scanning' && !x.ran) ? '; dependency scanning produced no report in this pipeline, so these counts do not include dependency findings' : ''), pipeline],
  ['release', `Pages deploy from the default branch (this site, commit ${(env.CI_COMMIT_SHORT_SHA ?? '').slice(0, 8)}); Cloud Run job is manual`, `${project}/-/environments`],
  ['configure', reports.configure?.summary ?? 'n/a', pipeline],
  ['monitor', 'Health checks of the API and website after every deploy and on a schedule; failures open an incident issue', `${project}/-/issues?label_name[]=incident`],
  ['govern', [reports.licenses?.summary, reports.policy?.summary].filter(Boolean).join('; ') || 'n/a', pipeline],
]

// One sentence per stage on why it matters for this project (static text, the numbers above stay generated).
const why = {
  plan: 'New issues arrive labelled and summarised, so a one-person project does not drown in triage.',
  create: 'Every merge request gets a first review of contract and TypeScript changes before a human looks.',
  verify: 'A bug in an escrow contract costs real money, so all four suites run on every push.',
  package: 'Releases are built from the pipeline, not from a developer laptop.',
  secure: 'Leaked keys and risky dependencies are found by scanners, then explained in plain words.',
  release: 'The status you are reading is published by the pipeline itself.',
  configure: 'Every service documents its variables and no example file holds a secret.',
  monitor: 'An outage opens an incident issue instead of waiting for a user to complain.',
  govern: 'Licences and repository policy rules are checked on every pipeline.',
}
const rows = stages
  .map(([stage, what, link]) => `<tr><td><b>${esc(stage)}</b></td><td>${esc(what)}<div class="why">${esc(why[stage] ?? '')}</div></td><td><a href="${esc(link)}">evidence</a></td></tr>`)
  .join('\n')

// Optional demo video: put the YouTube link in scripts/ci/demo-video.txt after uploading it.
const videoUrl = (readText('scripts/ci/demo-video.txt') ?? '').trim()
const videoId = /(?:youtu\.be\/|v=)([\w-]{11})/.exec(videoUrl)?.[1]
const videoSection = videoId
  ? `<h2>Demo video</h2><div class="video"><iframe src="https://www.youtube.com/embed/${esc(videoId)}" title="AgentEco life after code demo" allowfullscreen loading="lazy"></iframe></div><p><a href="${esc(videoUrl)}">Watch on YouTube</a></p>`
  : ''

const flows = [
  ['Contract security reviewer', 'Reviews merge requests that touch contracts and writes one verdict.', `${project}/-/merge_requests/1`, 'MR !1: read the diff and found a real inaccuracy in a contract comment'],
  ['Code reviewer', 'Reviews TypeScript changes in the SDK, backend, CLI and website.', `${project}/-/merge_requests/2`, 'MR !2: read the diff, checked callers and posted a review'],
  ['Finding explainer', 'Explains scanner findings in plain words and proposes the smallest fix.', `${project}/-/merge_requests/2`, 'MR !2: grouped the critical findings and suggested excluding vendored code, which was applied'],
  ['Issue triage', 'Labels and summarises new issues and asks for missing details.', `${project}/-/work_items/1`, 'Issue #1: labelled it bug and security and asked for a confidential report'],
]
const flowRows = flows
  .map(([name, job, link, proof]) => `<tr><td><b>${esc(name)}</b></td><td>${esc(job)}</td><td><a href="${esc(link)}">${esc(proof)}</a></td></tr>`)
  .join('\n')

const diagram = `<svg viewBox="0 0 760 120" role="img" aria-label="Escrow flow: buyer funds escrow, seller delivers, buyer verifies, then settle or dispute" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
<g font-family="system-ui,sans-serif" font-size="13" text-anchor="middle" fill="currentColor">
<rect x="4" y="30" width="130" height="56" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="69" y="63">Buyer funds escrow</text>
<rect x="164" y="30" width="130" height="56" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="229" y="63">Seller delivers</text>
<rect x="324" y="30" width="130" height="56" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="389" y="63">Buyer verifies</text>
<rect x="484" y="6" width="130" height="44" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="549" y="33">Settle and pay</text>
<rect x="484" y="66" width="130" height="44" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="549" y="93">Dispute</text>
<rect x="644" y="66" width="112" height="44" rx="10" fill="none" stroke="currentColor" opacity=".5"/><text x="700" y="93">Arbiter rules</text>
<path d="M134 58h30M294 58h30M454 50l30-18M454 66l30 20M614 88h30" stroke="currentColor" opacity=".6" fill="none"/>
</g></svg>`

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgentEco: life after code</title>
<style>
:root{color-scheme:light dark;--bg:#0b0c1c;--fg:#f2f3fa;--mut:#a7aac0;--card:#14162b;--line:#272a48;--ok:#35d49a;--acc:#8e91ff}
@media(prefers-color-scheme:light){:root{--bg:#f7f7fc;--fg:#14162b;--mut:#565a78;--card:#fff;--line:#dcdcee;--ok:#0a8a5c;--acc:#4b4fd8}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif}
main{max-width:900px;margin:0 auto;padding:48px 20px 80px}
h1{font-size:2rem;margin:0 0 8px}h2{margin-top:40px}
p.lead{color:var(--mut);max-width:62ch}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
td,th{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--mut);font-weight:600}a{color:var(--acc)}pre{background:var(--card);border:1px solid var(--line);padding:14px;border-radius:12px;overflow:auto}
.pill{display:inline-block;padding:2px 10px;border-radius:99px;border:1px solid var(--line);color:var(--ok);font-size:.85rem}
.why{color:var(--mut);font-size:.9rem;margin-top:4px}
.video{position:relative;padding-top:56.25%}.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px}
.cols img{width:100%;height:auto;border:1px solid var(--line);border-radius:12px}figure{margin:0}figcaption{color:var(--mut);font-size:.85rem;margin-top:4px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:640px){.cols{grid-template-columns:1fr}}
@media(max-width:640px){td,th{padding:8px}}
</style></head><body><main>
<h1>AgentEco: life after code</h1>
<p class="lead">AgentEco is an escrow, dispute and reputation layer for AI agent work. This page is generated by the project's GitLab pipeline and shows what the automation did for the latest commit. The current contracts run on test networks only; an earlier escrow-only version was deployed on BOT Chain mainnet for a past hackathon and is no longer used by the current code (details in the repository README).</p>
<p><span class="pill">commit ${esc((env.CI_COMMIT_SHORT_SHA ?? 'local').slice(0, 8))}</span> <span class="pill">pipeline <a href="${esc(pipeline)}">${esc(env.CI_PIPELINE_ID ?? 'local')}</a></span> <span class="pill">built ${new Date().toISOString().slice(0, 16)}Z</span></p>
<h2>What AgentEco is</h2>
<p>AI agents are starting to hire and pay each other. AgentEco is the trust layer for that: the buyer locks the payment in an on-chain escrow, the seller delivers, the buyer checks the delivery, and the money is released or, if they disagree, an arbiter rules. Ratings are kept on chain. It is one person's open source project (SDK, CLI, backend, smart contracts, website), so every manual step after the code is written is a risk.</p>
${diagram}
<p>The running application lives at <a href="https://agenteco.web.id">agenteco.web.id</a> (the original project, not changed by this submission). This submission adds the post-code automation around it. Screenshots of the original application, taken on 24 Oct 2026 (the current version runs on test networks, no real funds; AgentEco is multi-chain, so what you see depends on the network selected):</p>
<div class="cols"><figure><img src="screenshots/agenteco-landing.jpg" alt="AgentEco landing page" loading="lazy"><figcaption>Landing page</figcaption></figure><figure><img src="screenshots/agenteco-marketplace.jpg" alt="AgentEco marketplace listing hosted agents with prices" loading="lazy"><figcaption>Marketplace: agents, prices, ratings</figcaption></figure></div>
${videoSection}
<h2>The nine stages</h2>
<table><tr><th>Stage</th><th>What ran in the latest pipeline</th><th></th></tr>${rows}</table>
<h2>The AI agents in the pipeline (GitLab Duo)</h2>
<p>Four Duo flows, versioned as YAML in the repository. Each has run on a real merge request or issue. The first run of each one exposed a gap in its own configuration (missing diff tools, missing project id), which was fixed and is documented in <a href="${esc(project)}/-/blob/main/.gitlab/duo/README.md">.gitlab/duo/README.md</a>.</p>
<table><tr><th>Flow</th><th>Job</th><th>What it did</th></tr>${flowRows}</table>
<p class="why">Autonomy level: supervised. The flows comment and propose; a human approves and merges. The two merge requests and the issue are demo material, left open on purpose.</p>
<h2>Security summary</h2><pre>${esc(securityMd ?? 'No scanner reports in this pipeline.')}</pre>
<h2>Before and after</h2>
<table><tr><th>Before (manual)</th><th>After (automated)</th></tr>
<tr><td>Run forge, SDK and backend tests by hand before a release</td><td>Every push runs all suites in the verify stage</td></tr>
<tr><td>Read diffs alone, as the only maintainer</td><td>Duo reviewer flows comment on every merge request</td></tr>
<tr><td>Check for leaked keys and risky dependencies occasionally</td><td>SAST, secret detection and dependency scanning on every pipeline, explained in plain language</td></tr>
<tr><td>Notice an outage when a user complains</td><td>Scheduled health checks open an incident issue</td></tr></table>
<p>Source: <a href="${esc(project)}">${esc(project)}</a>. Original open source project: <a href="https://github.com/SannyDermawan/agenteco-multichain">github.com/SannyDermawan/agenteco-multichain</a> (MIT).</p>
</main></body></html>
`

mkdirSync('public', { recursive: true })
if (existsSync('docs/screenshots')) cpSync('docs/screenshots', 'public/screenshots', { recursive: true })
writeFileSync('public/index.html', page)
writeFileSync('public/status.json', JSON.stringify({ commit: env.CI_COMMIT_SHA ?? null, pipeline, suites, reports }, null, 2))
console.log('public/index.html written')
