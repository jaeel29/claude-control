#!/usr/bin/env node
/**
 * claudecontrolai launcher.
 *
 * Boots the prebuilt Nitro server (.output/server/index.mjs) on localhost.
 * This is a local-only tool — it reads your machine's ~/.claude data and shows
 * it in your browser. No accounts, no auth, nothing leaves your computer.
 *
 *   npx claudecontrolai            # http://localhost:3001
 *   npx claudecontrolai --port 4000
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')

function parseArgs(argv) {
  const args = { port: 3001 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port') args.port = Number(argv[++i])
    else if (a === '--help' || a === '-h') args.help = true
  }
  return args
}

function help() {
  console.log(`
claudecontrolai — a local dashboard for your Claude Code sessions

Usage:
  claudecontrolai [options]

Options:
  --port <n>     port to listen on (default 3001)
  -h, --help     show this help

Everything runs on your own computer. No account, no sign-up.
`)
}

const args = parseArgs(process.argv.slice(2))
if (args.help) { help(); process.exit(0) }

const entry = join(PKG_ROOT, '.output', 'server', 'index.mjs')
if (!existsSync(entry)) {
  console.error('✖ Build not found at .output/server/index.mjs')
  console.error('  Run `npm run build` first (or reinstall the package).')
  process.exit(1)
}

const env = {
  ...process.env,
  HOST: '127.0.0.1',
  PORT: String(args.port),
  NITRO_HOST: '127.0.0.1',
  NITRO_PORT: String(args.port),
}

console.log('')
console.log('  claudecontrolai')
console.log('  ──────────────────────────────────────────')
console.log(`  dashboard:  http://localhost:${args.port}`)
console.log('  ──────────────────────────────────────────')
console.log('')

const child = spawn(process.execPath, [entry], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
