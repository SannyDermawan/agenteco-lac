// govern stage, part 2: repository policy as code. Each rule is a small, explainable check.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { writeReport, fail } from './lib.mjs'

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
const text = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '')

const rules = [
  ['The MIT license is present', () => /MIT License/i.test(text('LICENSE'))],
  ['CODEOWNERS names a reviewer', () => /@/.test(text('.gitlab/CODEOWNERS'))],
  ['A merge request template exists', () => existsSync('.gitlab/merge_request_templates/Default.md')],
  ['Issue templates exist', () => existsSync('.gitlab/issue_templates/Bug.md') && existsSync('.gitlab/issue_templates/Feature.md')],
  ['SECURITY.md explains how to report a vulnerability', () => /report/i.test(text('SECURITY.md'))],
  ['No .env file is tracked (only .env.example templates)', () => !tracked.some((f) => /(^|\/)\.env(\.[^/]+)?$/.test(f) && !f.endsWith('.example'))],
  ['No wallet or keypair files are tracked', () => !tracked.some((f) => /(^|\/)(\.proof\/|wallets?\.json|id\.json|.*-keypair\.json)/.test(f))],
  ['Duo flow definitions are in the repository', () => tracked.some((f) => f.startsWith('.gitlab/duo/flows/'))],
  ['The README says the networks are test networks', () => /test ?net|test network/i.test(text('README.md'))],
]

const results = rules.map(([name, check]) => ({ name, passed: Boolean(check()) }))
const failed = results.filter((r) => !r.passed)
const report = writeReport('policy', {
  stage: 'govern',
  ok: failed.length === 0,
  summary: `${results.length - failed.length}/${results.length} policy rules pass`,
  results,
})
console.log(report.summary)
for (const r of results) console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.name}`)
for (const r of failed) fail(`Policy failed: ${r.name}`)
