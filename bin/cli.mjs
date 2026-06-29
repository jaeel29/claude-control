#!/usr/bin/env node
/**
 * claudecontrolai launcher.
 *
 * Boots the prebuilt Nitro server (.output/server/index.mjs) and shows your
 * Claude Code sessions in the browser. Local by default; optional phone access
 * over your private Tailscale network (Paperclip-style).
 *
 *   npx claudecontrolai                          # http://localhost:3001
 *   npx claudecontrolai --bind tailnet           # reach it from your phone (token-gated)
 *   npx claudecontrolai --bind tailnet --allow-remote-run
 *   npx claudecontrolai --port 4000
 */

import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { renderUnicodeCompact } from 'uqr'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')
const CONFIG_DIR = join(homedir(), '.claudecontrol')
const TOKEN_FILE = join(CONFIG_DIR, 'token')

function parseArgs(argv) {
  const args = { bind: 'localhost', port: 3001, token: '', allowRemoteRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--bind') args.bind = argv[++i]
    else if (a === '--port') args.port = Number(argv[++i])
    else if (a === '--token') args.token = argv[++i]
    else if (a === '--allow-remote-run') args.allowRemoteRun = true
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
  --bind <mode>          localhost (default) | lan | tailnet | public
                           lan     = same Wi-Fi — open it on your phone, no setup
                           tailnet = your private Tailscale network (anywhere)
  --port <n>             port to listen on (default 3001)
  --token <secret>       access token for remote auth (auto-generated if omitted)
  --allow-remote-run     permit starting/stopping Claude over the network
                         (default: remote is view-only)
  -h, --help             show this help

Local use needs no account. To open it on your phone on the same Wi-Fi:
  npx claudecontrolai --bind lan
`)
}

function loadOrCreateToken(supplied) {
  if (supplied) return supplied
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = readFileSync(TOKEN_FILE, 'utf8').trim()
      if (t) return t
    }
  } catch {}
  const t = randomBytes(18).toString('base64url')
  try {
    mkdirSync(CONFIG_DIR, { recursive: true })
    writeFileSync(TOKEN_FILE, t, { mode: 0o600 })
  } catch {}
  return t
}

function tailscaleIp() {
  try {
    const out = execSync('tailscale ip -4', { encoding: 'utf8', timeout: 3000 }).trim()
    const ip = out.split('\n')[0]?.trim()
    if (ip) return ip
  } catch {}
  // Fallback: scan for the 100.64.0.0/10 CGNAT range Tailscale uses.
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        const [a, b] = ni.address.split('.').map(Number)
        if (a === 100 && b >= 64 && b <= 127) return ni.address
      }
    }
  }
  return null
}

// First non-internal IPv4 (the machine's LAN address) — for phone access on the
// same Wi-Fi without Tailscale.
function lanIp() {
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address
    }
  }
  return null
}

const args = parseArgs(process.argv.slice(2))
if (args.help) { help(); process.exit(0) }

const entry = join(PKG_ROOT, '.output', 'server', 'index.mjs')
if (!existsSync(entry)) {
  console.error('✖ Build not found at .output/server/index.mjs')
  console.error('  Run `npm run build` first (or reinstall the package).')
  process.exit(1)
}

let host = '127.0.0.1'
let networkHost = null   // address to show for "open this on your phone"
let remote = false

if (args.bind === 'lan') {
  // All interfaces → reachable on the computer (localhost) AND on phones on the
  // same Wi-Fi (the LAN IP). Same server, both work, no extra software.
  host = '0.0.0.0'; networkHost = lanIp(); remote = true
} else if (args.bind === 'tailnet') {
  const ip = tailscaleIp()
  if (!ip) {
    console.error('✖ Could not find a Tailscale IP.')
    console.error('  Install Tailscale and run `tailscale up` first: https://tailscale.com/download')
    process.exit(1)
  }
  host = ip; networkHost = ip; remote = true
} else if (args.bind === 'public') {
  host = '0.0.0.0'; networkHost = lanIp(); remote = true
} else if (args.bind !== 'localhost') {
  console.error(`✖ Unknown --bind value: ${args.bind} (expected localhost | lan | tailnet | public)`)
  process.exit(1)
}

const token = remote ? loadOrCreateToken(args.token) : (args.token || '')

const env = {
  ...process.env,
  HOST: host,
  PORT: String(args.port),
  NITRO_HOST: host,
  NITRO_PORT: String(args.port),
  CC_APP_MODE: 'app',          // installed app → "/" goes to the dashboard, not the landing page
  CC_BIND: args.bind,
  CC_AUTH_TOKEN: token,
  CC_ALLOW_REMOTE_RUN: args.allowRemoteRun ? '1' : '0',
}

// Phone URL points straight at the login page with the token pre-filled, so a
// QR scan lands the user authenticated — no manual typing on a phone keyboard.
const phoneUrl = networkHost
  ? `http://${networkHost}:${args.port}/login?token=${encodeURIComponent(token)}`
  : null

console.log('')
console.log('  claudecontrolai')
console.log('  ──────────────────────────────────────────')
console.log(`  computer:    http://localhost:${args.port}`)
if (remote) {
  if (phoneUrl) {
    console.log(`  phone:       ${phoneUrl}`)
    console.log('               (open this on your phone, or scan the QR below)')
  } else {
    console.log('  phone:       (no network address found)')
  }
  console.log(`  token:       ${token}`)
  console.log(`  remote run:  ${args.allowRemoteRun ? 'ENABLED ⚠️  (can execute code remotely)' : 'view-only'}`)
  if (args.bind === 'public') {
    console.log('  ⚠️  public bind exposes this host on your network — use a firewall.')
  }
  if (phoneUrl) {
    console.log('  ──────────────────────────────────────────')
    console.log('  Scan to open on your phone:')
    console.log('')
    // Indent each QR line so it sits under the banner.
    for (const line of renderUnicodeCompact(phoneUrl).split('\n')) {
      console.log('    ' + line)
    }
    console.log('')
  }
} else {
  console.log('  phone:       run with --bind lan (same Wi-Fi) or --bind tailnet')
}
console.log('  ──────────────────────────────────────────')
console.log('')

const child = spawn(process.execPath, [entry], { env, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
