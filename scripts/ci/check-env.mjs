// configure stage: the environment contract.
// Every service documents its variables in a .env.example, and none of those files may hold a real secret.
import { existsSync, readFileSync } from 'node:fs'
import { writeReport, fail } from './lib.mjs'

const EXAMPLES = ['backend/.env.example', 'frontend/.env.example', 'seller-agent/.env.example', 'buyer-agent/.env.example']
// Values that look like real credentials: long hex, provider key prefixes, private key blocks.
const SECRET_SHAPES = [/\b0x[0-9a-fA-F]{64}\b/, /\bgsk_[A-Za-z0-9]{20,}/, /\bAIza[0-9A-Za-z_-]{30,}/, /\bsk-[A-Za-z0-9]{30,}/, /-----BEGIN [A-Z ]*PRIVATE KEY/]

const files = []
const problems = []
for (const path of EXAMPLES) {
  if (!existsSync(path)) {
    problems.push(`${path} is missing`)
    continue
  }
  const names = []
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*#?\s*([A-Z][A-Z0-9_]+)\s*=(.*)$/.exec(line)
    if (!match) continue
    names.push(match[1])
    if (SECRET_SHAPES.some((shape) => shape.test(match[2]))) problems.push(`${path}: ${match[1]} holds a value that looks like a secret`)
  }
  files.push({ path, variables: names.length })
}

const report = writeReport('configure', {
  stage: 'configure',
  ok: problems.length === 0,
  summary: `${files.length} environment templates, ${files.reduce((n, f) => n + f.variables, 0)} documented variables, ${problems.length} problems`,
  files,
  problems,
})
console.log(report.summary)
for (const p of problems) fail(`PROBLEM: ${p}`)
