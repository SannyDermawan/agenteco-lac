// Small helpers shared by the CI scripts. No dependencies, runs on plain Node 22.
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const REPORTS = 'reports'

export function writeReport(name, data) {
  mkdirSync(REPORTS, { recursive: true })
  const body = { name, finishedAt: new Date().toISOString(), ...data }
  writeFileSync(join(REPORTS, `${name}.json`), JSON.stringify(body, null, 2))
  return body
}

export function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

export function readText(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

export function listReports() {
  if (!existsSync(REPORTS)) return []
  return readdirSync(REPORTS)
}

export function fail(message) {
  console.error(message)
  process.exitCode = 1
}
