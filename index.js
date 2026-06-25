'use strict';

const fs       = require('fs');
const path     = require('path');
const pino     = require('pino');
const readline = require('readline');
const { Boom } = require('@hapi/boom');
const axios    = require('axios');
const cron     = require('node-cron');
const moment   = require('moment-timezone');

// ─── Carga de Baileys ──────────────────────────────────────────────────────────
let makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason;
let downloadMediaMessage, getContentType, makeCacheableSignalKeyStore;

async function loadBaileys() {
  try {
    const mod = await import('@whiskeysockets/baileys');
    const root = mod.default || mod;

    makeWASocket              = root.default || root.makeWASocket || root;
    useMultiFileAuthState     = root.useMultiFileAuthState     || mod.useMultiFileAuthState;
    fetchLatestBaileysVersion = root.fetchLatestBaileysVersion || mod.fetchLatestBaileysVersion;
    DisconnectReason          = root.DisconnectReason          || mod.DisconnectReason;
    downloadMediaMessage      = root.downloadMediaMessage      || mod.downloadMediaMessage;
    getContentType            = root.getContentType            || mod.getContentType;
    makeCacheableSignalKeyStore = root.makeCacheableSignalKeyStore || mod.makeCacheableSignalKeyStore || null;

    if (typeof makeWASocket !== 'function') {
      throw new Error('makeWASocket no es una función — revisa la estructura del fork @whiskeysockets/baileys.');
    }
    if (typeof useMultiFileAuthState !== 'function') {
      throw new Error('useMultiFileAuthState no encontrada en @whiskeysockets/baileys.');
    }
  } catch (err) {
    console.error('\n  ❌  No se pudo cargar @whiskeysockets/baileys.');
    console.error(`      ${String(err?.message || err)}`);
    console.error('  ➜  Ejecuta: npm install\n');
    process.exit(1);
  }
}

const { reloadCommands } = require('./utils/reloadCommands');

// ─── Rutas y constantes ────────────────────────────────────────────────────────
const SETTINGS_FILE  = path.join(process.cwd(), 'settings.json');
const SESSION_DIR    = path.join(process.cwd(), 'session', 'maneki-neko');
const RUNTIME_DIR    = path.join(process.cwd(), 'runtime');
const CONNECTED_FILE  = path.join(RUNTIME_DIR, 'connected.json');
const ACTIVITY_FILE   = path.join(RUNTIME_DIR, 'activity.json');
const USERS_FILE      = path.join(RUNTIME_DIR, 'users.json');

const MAIN_OWNER        = '59177474230';
const EXTRA_OWNER       = '59177474230';
const LINKED_BOT_NUMBER = '59177474230';

const DEFAULT_SETTINGS = {
  prefix:           ['.', '#'],
  ownerNumber:      [MAIN_OWNER, EXTRA_OWNER],
  botNumber:        LINKED_BOT_NUMBER,
  authFolder:       SESSION_DIR,
  pairingMode:      '',
  phoneNumber:      '',
  apiBaseUrl:       'https://elvigilante-api.onrender.com',
  apiKey:           'elvigilante',
  antiPrivate:      false,
  groupOptions:     {},
  antiLinkWarnings: {},
};

// ─── Constantes de vinculación ─────────────────────────────────────────────────
const PAIRING_CODE_CACHE_MS       = 60_000;
const PAIRING_405_COOLDOWN_MS     = 40 * 60 * 1000;
const PAIRING_QR_FALLBACK_MS      = 60 * 60 * 1000;
const PAIRING_REQUEST_TIMEOUT_MS  = 25_000;
const PAIRING_SOCKET_WAIT_MS      = 15_000;
const RECONNECT_BASE_DELAY_MS     = 1800;
const RECONNECT_MAX_DELAY_MS      = 30_000;
const RECONNECT_CODE0_MIN_DELAY_MS = 4500;

// ─── Estado global ─────────────────────────────────────────────────────────────
let settings          = loadSettings();
let booting           = false;
let reconnectTimer    = null;
let reconnectAttempts = 0;
let socketToken       = 0;

// Estado del sistema de vinculación
let pairingMode         = '';   // 'qr' | 'code' | ''
let pairingCooldownUntil = 0;
let pairingQrFallbackUntil = 0;
let lastPairingCode     = '';
let lastPairingNumber   = '';
let lastPairingAt       = 0;
let pairingRequested    = false;
let pairingResetTimer   = null;

// ═══════════════════════════════════════════════════════════════════════════════
//  COLORES Y DISEÑO DE CONSOLA
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  italic:   '\x1b[3m',
  under:    '\x1b[4m',
  blink:    '\x1b[5m',
  black:    '\x1b[30m',
  red:      '\x1b[31m',
  green:    '\x1b[32m',
  yellow:   '\x1b[33m',
  blue:     '\x1b[34m',
  magenta:  '\x1b[35m',
  cyan:     '\x1b[36m',
  white:    '\x1b[37m',
  bred:     '\x1b[91m',
  bgreen:   '\x1b[92m',
  byellow:  '\x1b[93m',
  bblue:    '\x1b[94m',
  bmagenta: '\x1b[95m',
  bcyan:    '\x1b[96m',
  bwhite:   '\x1b[97m',
  bgBlack:  '\x1b[40m',
  bgRed:    '\x1b[41m',
  bgGreen:  '\x1b[42m',
  bgBlue:   '\x1b[44m',
  bgCyan:   '\x1b[46m',
};

function c(color, text) {
  return `${C[color] || ''}${text}${C.reset}`;
}

function cc(c1, c2, text) {
  return `${C[c1] || ''}${C[c2] || ''}${text}${C.reset}`;
}

function line(style = 'single', color = 'cyan') {
  const chars = {
    single: '─',
    double: '═',
    star:   '✦',
    dot:    '·',
    wave:   '≈',
    dash:   '- ',
  };
  const ch = chars[style] || chars.single;
  const w  = style === 'star' || style === 'dot' ? 48 : 56;
  console.log(c(color, ch.repeat(Math.floor(w / ch.length))));
}

function log(label, msg, color = 'cyan') {
  const now  = new Date();
  const time = now.toLocaleTimeString('es-PE', { hour12: false });
  const tag  = String(label).padEnd(9);
  const ico  = LABEL_ICONS[label] || '•';
  process.stdout.write(
    `${cc('dim','black',`[${time}]`)} ${c(color, `${ico} [${tag}]`)} ${msg}\n`
  );
}

const LABEL_ICONS = {
  SESSION:  '💾', BAILEYS: '⚙️ ', CODE:    '🔑', QR:      '📷',
  CMD:      '💬', AUTH:    '🔒', CLOSE:   '🔴', RECONECT:'🔄',
  CONFIG:   '⚙️ ', FATAL:   '💀', ERR:     '❌', INFO:    'ℹ️ ',
  CONNECT:  '🟢', INPUT:   '📝', PAIRING: '🔗',
};

// ═══════════════════════════════════════════════════════════════════════════════
//  BANNERS
// ═══════════════════════════════════════════════════════════════════════════════

function printBanner() {
  const owners = getOwnerNumbers().join(', ');
  const bot    = normalizeNumber(settings.botNumber || '-') || '-';
  const prefix = String(settings.prefix || '.');

  console.log('');
  console.log(cc('bold','bmagenta','╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bwhite','  ███╗   ███╗ █████╗ ███╗   ██╗███████╗██╗  ██╗██╗') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan', '  ████╗ ████║██╔══██╗████╗  ██║██╔════╝██║ ██╔╝██║') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan', '  ██╔████╔██║███████║██╔██╗ ██║█████╗  █████╔╝ ██║') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bblue', '  ██║╚██╔╝██║██╔══██║██║╚██╗██║██╔══╝  ██╔═██╗ ██║') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bblue', '  ██║ ╚═╝ ██║██║  ██║██║ ╚████║███████╗██║  ██╗██║') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + cc('dim', 'white', '  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bwhite','        🐾  N E K O   —   W H A T S A P P  🐾         ') + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bmagenta','║') + c('byellow', `  👑  Owners  » ${owners.slice(0,37).padEnd(37)}`) + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + c('bcyan',   `  🤖  Bot     » ${bot.padEnd(37)}`) + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','║') + c('bgreen',  `  ⌨️   Prefix  » ${prefix.padEnd(37)}`) + cc('bold','bmagenta','  ║'));
  console.log(cc('bold','bmagenta','╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function printConnected(me) {
  console.log('');
  console.log(cc('bold','bgreen', '╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','                                                      ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','    ██████╗ ██╗  ██╗    ██████╗  ██████╗              ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','   ██╔═══██╗██║ ██╔╝   ██╔═══██╗██╔════╝              ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','   ██║   ██║█████╔╝    ██║   ██║██║                   ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','   ██║   ██║██╔═██╗    ██║   ██║██║                   ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','   ╚██████╔╝██║  ██╗   ╚██████╔╝╚██████╗              ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('dim',  'white','    ╚═════╝ ╚═╝  ╚═╝    ╚═════╝  ╚═════╝              ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bwhite','                                                      ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bgreen', '║') + cc('bold','byellow',`  🤖  Bot     » ${String(me||'-').padEnd(37)}`) + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bcyan',  `  👑  Owners  » ${getOwnerNumbers().join(', ').slice(0,37).padEnd(37)}`) + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '║') + cc('bold','bmagenta',`  ⌨️   Prefix  » ${String(settings.prefix||'.').padEnd(37)}`) + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen', '╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function printCode(code) {
  const raw     = String(code || '').trim();
  const noGuion = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const display = raw.includes('-') ? raw.toUpperCase()
                : noGuion.length === 8 ? `${noGuion.slice(0,4)}-${noGuion.slice(4)}`
                : raw.toUpperCase();

  console.log('');
  console.log(cc('bold','byellow','╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','byellow','║') + cc('bold','bwhite','       ✦  CÓDIGO DE VINCULACIÓN GENERADO  ✦            ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','byellow','║') + '                                                      ' + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + cc('bold','bgreen',`         🔑  ${display.padEnd(42)}`) + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + cc('dim','white',  `             sin guión: ${noGuion.padEnd(31)}`) + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + '                                                      ' + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','byellow','║') + cc('bold','bwhite','  📱  PASOS PARA VINCULAR:                            ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + c('bcyan','     1.  Abre WhatsApp en tu teléfono                ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + c('bcyan','     2.  Ve a Ajustes → Dispositivos vinculados       ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + c('bcyan','     3.  Toca "Vincular con número de teléfono"       ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + c('bcyan','     4.  Ingresa exactamente el código de arriba      ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','║') + c('bmagenta','  ⏱️   Tienes ~60 segundos para ingresarlo            ') + cc('bold','byellow','║'));
  console.log(cc('bold','byellow','╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MENÚ DE VINCULACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Readline seguro ──────────────────────────────────────────────────────────
const HAS_TTY   = Boolean(process.stdin?.isTTY && process.stdout?.isTTY);
const rl        = HAS_TTY
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null;
let rlClosed    = !HAS_TTY;
let promptBusy  = false;

if (rl) rl.on('close', () => { rlClosed = true; });

function canPrompt() {
  return Boolean(HAS_TTY && rl && !rlClosed);
}

function ask(question) {
  return new Promise((resolve, reject) => {
    if (!canPrompt()) { resolve(''); return; }
    while (promptBusy) {}   // simple guard
    promptBusy = true;
    try {
      rl.question(question, (ans) => { promptBusy = false; resolve(String(ans || '').trim()); });
    } catch (e) {
      promptBusy = false;
      if (e?.code === 'ERR_USE_AFTER_CLOSE') { rlClosed = true; resolve(''); }
      else reject(e);
    }
  });
}

// ─── Helpers pairing ─────────────────────────────────────────────────────────
function sanitizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizePhone(v) {
  let d = sanitizePhone(v);
  if (!d) return '';
  if (d.startsWith('00') && d.length > 2) d = d.slice(2);
  if (d.startsWith('0') && d.length >= 10) d = d.replace(/^0+/, '');
  if (d.length < 10 || d.length > 15) return '';
  return d;
}

function isPairingCooldown() {
  return Boolean(pairingCooldownUntil && pairingCooldownUntil > Date.now());
}

function isPairingQrFallback() {
  return Boolean(pairingQrFallbackUntil && pairingQrFallbackUntil > Date.now());
}

function preferQr() {
  const env = String(process.env.PAIRING_MODE || '').trim().toLowerCase();
  if (['qr','scan'].includes(env)) return true;
  if (['code','pairing','phone'].includes(env)) return false;
  return !canPrompt();   // sin TTY → QR por defecto
}

function clearPairingResetTimer() {
  if (pairingResetTimer) { clearTimeout(pairingResetTimer); pairingResetTimer = null; }
}

function cachePairingCode(code, number) {
  clearPairingResetTimer();
  pairingRequested  = true;
  lastPairingCode   = String(code || '');
  lastPairingNumber = String(number || '');
  lastPairingAt     = Date.now();

  pairingResetTimer = setTimeout(() => {
    pairingRequested  = false;
    lastPairingCode   = '';
    lastPairingNumber = '';
    lastPairingAt     = 0;
  }, PAIRING_CODE_CACHE_MS);
  pairingResetTimer.unref?.();
}

function resetPairingCache() {
  clearPairingResetTimer();
  pairingRequested  = false;
  lastPairingCode   = '';
  lastPairingNumber = '';
  lastPairingAt     = 0;
}

// ─── Menú interactivo ──────────────────────────────────────────────────────────
async function choosePairingMode() {
  // Sin TTY: decidir por env o por número guardado
  if (!canPrompt()) {
    const env  = String(process.env.PAIRING_MODE || '').trim().toLowerCase();
    const num  = normalizePhone(settings.phoneNumber || process.env.PAIRING_NUMBER || '');
    pairingMode = ['code','pairing','phone'].includes(env) ? 'code'
                : ['qr','scan'].includes(env) ? 'qr'
                : num ? 'code' : 'qr';
    log('PAIRING', `Sin consola interactiva → modo ${pairingMode.toUpperCase()} automático.`, 'yellow');
    return { mode: pairingMode, phone: pairingMode === 'code' ? num : '' };
  }

  // Con TTY: banner + menú de vinculación
  printBanner();
  console.log(cc('bold','bmagenta','╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bwhite','      ✦  MANEKI-NEKO BOT  —  TIPO DE CONEXIÓN  ✦      ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bmagenta','║') + '                                                      ' + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  ┌─────────────────────────────────────────────────┐  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │                                                 │  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │') + cc('bold','bgreen','  【 1 】  📷  QR Rápido (Recomendado / Estable)  ') + cc('bold','bcyan','│  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │') + cc('dim', 'white','         Escanea el código QR desde WhatsApp      ') + cc('bold','bcyan','│  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │                                                 │  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │') + cc('bold','byellow','  【 2 】  🔑  Número + Código (8 dígitos)        ') + cc('bold','bcyan','│  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │') + cc('dim', 'white','         Vinculación por teléfono con código      ') + cc('bold','bcyan','│  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  │                                                 │  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('bold','bcyan','  └─────────────────────────────────────────────────┘  ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + '                                                      ' + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','║') + cc('dim','white','  ⚠️  Si falla el código, usa QR por 30-40 min        ') + cc('bold','bmagenta','║'));
  console.log(cc('bold','bmagenta','╚══════════════════════════════════════════════════════╝'));
  console.log('');

  let option = '';
  for (let i = 0; i < 3; i++) {
    option = (await ask(cc('bold','bgreen','  ➜  Elige modo [1/2]: '))).trim();
    if (option === '1' || option === '2') break;
    log('INPUT', `Opción "${c('bred', option)}" inválida. Escribe ${c('bgreen','1')} o ${c('byellow','2')}.`, 'red');
  }

  if (option !== '1' && option !== '2') {
    pairingMode = 'qr';
    log('PAIRING', 'No se eligió opción válida. Usando modo QR por defecto.', 'yellow');
    return { mode: 'qr', phone: '' };
  }

  pairingMode = option === '2' ? 'code' : 'qr';

  if (pairingMode === 'qr') {
    saveSettings({ pairingMode: 'qr', phoneNumber: '' });
    console.log('');
    console.log(cc('bold','byellow','╔══════════════════════════════════════════════════════╗'));
    console.log(cc('bold','byellow','║') + cc('bold','bwhite','         ✦  VINCULACIÓN POR CÓDIGO QR  ✦              ') + cc('bold','byellow','║'));
    console.log(cc('bold','byellow','╠══════════════════════════════════════════════════════╣'));
    console.log(cc('bold','byellow','║') + c('bwhite','  📷  El código QR aparecerá en la consola.           ') + cc('bold','byellow','║'));
    console.log(cc('bold','byellow','║') + c('bcyan', '  1.  Abre WhatsApp → Dispositivos vinculados         ') + cc('bold','byellow','║'));
    console.log(cc('bold','byellow','║') + c('bcyan', '  2.  Toca "Escanear código QR"                       ') + cc('bold','byellow','║'));
    console.log(cc('bold','byellow','║') + c('bcyan', '  3.  Apunta la cámara al QR en consola               ') + cc('bold','byellow','║'));
    console.log(cc('bold','byellow','╚══════════════════════════════════════════════════════╝'));
    console.log('');
    return { mode: 'qr', phone: '' };
  }

  // Modo código: pedir número
  console.log('');
  console.log(cc('bold','bcyan','╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','bcyan','║') + cc('bold','bwhite','       ✦  VINCULACIÓN POR CÓDIGO DE NÚMERO  ✦          ') + cc('bold','bcyan','║'));
  console.log(cc('bold','bcyan','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bcyan','║') + c('bwhite','  ℹ️   Ingresa tu número CON código de país,              ') + cc('bold','bcyan','║'));
  console.log(cc('bold','bcyan','║') + c('bwhite','       sin el signo "+" al inicio.                        ') + cc('bold','bcyan','║'));
  console.log(cc('bold','bcyan','║') + c('byellow','       Ejemplo: 59177474230  (Bolivia)                    ') + cc('bold','bcyan','║'));
  console.log(cc('bold','bcyan','║') + c('byellow','                51912345678  (Perú)                       ') + cc('bold','bcyan','║'));
  console.log(cc('bold','bcyan','╚══════════════════════════════════════════════════════╝'));
  console.log('');

  let clean = '';
  while (!clean) {
    const raw = await ask(cc('bold','bgreen','  ➜  Número (con código de país): '));
    clean = normalizePhone(raw);
    if (!clean) {
      log('INPUT', `Número "${c('bred', raw)}" inválido. Usa 10 a 15 dígitos con código de país.`, 'red');
    }
  }

  saveSettings({ pairingMode: 'code', phoneNumber: clean });

  console.log('');
  console.log(cc('bold','bgreen','╔══════════════════════════════════════════════════════╗'));
  console.log(cc('bold','bgreen','║') + cc('bold','bwhite','  ✅  Configuración guardada — modo CÓDIGO             ') + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen','╠══════════════════════════════════════════════════════╣'));
  console.log(cc('bold','bgreen','║') + c('bcyan',   `  📱  Número  » ${clean.padEnd(37)}`) + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen','║') + c('byellow', `  🔑  Modo    » Código de vinculación${''.padEnd(20)}`) + cc('bold','bgreen','║'));
  console.log(cc('bold','bgreen','╚══════════════════════════════════════════════════════╝'));
  console.log('');

  return { mode: 'code', phone: clean };
}

// ─── Solicitar código con reintentos robustos ─────────────────────────────────
async function requestCodeWithRetry(sock, number) {
  const clean = String(number || '').replace(/\D/g, '');

  for (let i = 1; i <= 4; i++) {
    try {
      if (i > 1) {
        const waitSec = i === 2 ? 8 : i === 3 ? 15 : 20;
        log('CODE', `Reintento ${c('byellow',`${i}/4`)} — esperando ${waitSec}s...`, 'yellow');
        await delay(waitSec * 1000);
      } else {
        log('CODE', `Solicitando código para ${c('bcyan', clean)}...`, 'yellow');
      }

      const code   = await sock.requestPairingCode(clean);
      const result = String(code || '').trim();
      if (result) return result;
      throw new Error('Código vacío');

    } catch (e) {
      const status = Number(e?.output?.statusCode || e?.data?.statusCode || 0);
      const msg    = String(e?.message || '').toLowerCase();

      log('CODE', `Intento ${i}/4 → ${c('bred', status || 'ERR')} — ${String(e?.message || '').slice(0, 60)}`, 'red');

      // Cooldown 405
      if (status === 405 || /method\s*not\s*allowed|connection\s*failure/i.test(msg)) {
        pairingCooldownUntil   = Date.now() + PAIRING_405_COOLDOWN_MS;
        pairingQrFallbackUntil = Date.now() + PAIRING_QR_FALLBACK_MS;
        const waitMin = Math.ceil(PAIRING_405_COOLDOWN_MS / 60000);
        log('CODE', c('bred', `WhatsApp rechazó con 405. Pausa de ${waitMin} min activa.`), 'red');
        log('CODE', c('byellow', 'Modo QR activo temporalmente. Usa escaneo QR para vincular.'), 'yellow');
        throw e;
      }

      const isRetry = [0, 404, 408, 428, 429, 500, 503].includes(status) ||
                      msg.includes('timeout') ||
                      msg.includes('network') ||
                      msg.includes('vacío') ||
                      msg.includes('connection closed');

      if (!isRetry || i === 4) throw e;
    }
  }
  throw new Error('No se obtuvo código tras 4 intentos.');
}

// ─── Esperar progreso del socket antes de pedir código ────────────────────────
async function waitSocketReady(sock, timeoutMs = PAIRING_SOCKET_WAIT_MS) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const ws = sock?.ws?.readyState;
    if (ws === 1 /* OPEN */ || sock?.user) return true;
    await delay(300);
  }
  return Boolean(sock?.ws?.readyState === 1 || sock?.user);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeNumber(value = '') {
  if (Array.isArray(value)) return value.map(normalizeNumber).filter(Boolean);
  return String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function normalizeLid(value = '') {
  return String(value || '').trim();
}

function getOwnerNumbers() {
  const raw  = settings.ownerNumbers || settings.ownerNumber || DEFAULT_SETTINGS.ownerNumber;
  const list = Array.isArray(raw) ? raw : [raw];
  return [...new Set([MAIN_OWNER, EXTRA_OWNER, ...list].map(normalizeNumber).filter(Boolean))];
}

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    const merged = { ...DEFAULT_SETTINGS, ...(parsed || {}) };
    if (!Array.isArray(merged.ownerNumber)) merged.ownerNumber = [merged.ownerNumber].filter(Boolean);
    if (!merged.ownerNumber.includes(EXTRA_OWNER)) merged.ownerNumber.push(EXTRA_OWNER);
    if (!merged.ownerNumber.includes(MAIN_OWNER))  merged.ownerNumber.unshift(MAIN_OWNER);
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(patch = {}) {
  settings = { ...DEFAULT_SETTINGS, ...settings, ...(patch || {}) };
  if (!Array.isArray(settings.ownerNumber)) settings.ownerNumber = [settings.ownerNumber].filter(Boolean);
  if (!settings.ownerNumber.includes(MAIN_OWNER))  settings.ownerNumber.unshift(MAIN_OWNER);
  if (!settings.ownerNumber.includes(EXTRA_OWNER)) settings.ownerNumber.push(EXTRA_OWNER);
  settings.ownerNumber = [...new Set(settings.ownerNumber.map(normalizeNumber).filter(Boolean))];
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

function isOwner(jid = '') {
  const sender = normalizeNumber(jid);
  if (!sender) return false;
  const HARDCODED = [MAIN_OWNER, EXTRA_OWNER, LINKED_BOT_NUMBER];
  const fromSettings = getOwnerNumbers();
  const botNumber    = normalizeNumber(settings.botNumber || '');
  const ownerLids    = [].concat(settings.ownerLids || [], settings.ownerLid || []).map(normalizeLid).filter(Boolean);
  const adminLids    = [].concat(settings.adminLids || [], settings.adminLid || []).map(normalizeLid).filter(Boolean);
  const rawSender    = normalizeLid(jid);
  const all = [...new Set([...HARDCODED, ...fromSettings, botNumber].filter(Boolean))];
  return all.includes(sender) || ownerLids.includes(rawSender) || adminLids.includes(rawSender);
}

function getGroupOptions(chatId = '') {
  const all = settings?.groupOptions && typeof settings.groupOptions === 'object'
    ? settings.groupOptions : {};
  return all[chatId] || {};
}

function normalizeUserJid(jid = '') {
  const user = String(jid || '').split(':')[0];
  if (!user) return '';
  if (user.endsWith('@s.whatsapp.net')) return user;
  return `${user.replace(/@.+$/, '')}@s.whatsapp.net`;
}

// ─── Helper robusto para buscar participante (maneja LID, JID y dispositivos) ──
function findParticipant(participants = [], jid = '') {
  const jidStr = String(jid || '').trim();
  if (!jidStr) return undefined;

  const jidNum = jidStr.split('@')[0].split(':')[0].replace(/\D/g, '');
  const jidBaseClean = jidStr.split('@')[0].split(':')[0];

  return participants.find((p) => {
    const pId = String(p.id || '').trim();
    if (!pId) return false;

    if (pId === jidStr) return true;

    const pBase      = pId.split('@')[0];
    const pNum       = pBase.split(':')[0].replace(/\D/g, '');
    const pBaseClean = pBase.split(':')[0];

    if (jidNum && pNum && jidNum === pNum) return true;

    if (jidBaseClean && pBaseClean && jidBaseClean === pBaseClean) return true;

    return false;
  });
}

function isGroupAdmin(participants = [], jid = '', lidJid = '') {
  const jidNum = String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

  for (const p of participants) {
    const pId  = String(p.id || '');
    const pNum = pId.split('@')[0].split(':')[0].replace(/\D/g, '');

    if (pId === jid) return Boolean(p.admin);
    if (jidNum && pNum && jidNum === pNum) return Boolean(p.admin);

    if (p.phoneNumber) {
      const pPhone = String(p.phoneNumber).replace(/\D/g, '');
      if (jidNum && pPhone && jidNum === pPhone) return Boolean(p.admin);
    }

    if (lidJid && pId === String(lidJid)) return Boolean(p.admin);
  }
  return false;
}

function getParticipantEntry(participants = [], jid = '') {
  const jidNum = String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
  return participants.find((p) => {
    const pId  = String(p.id || '');
    const pNum = pId.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (pId === jid) return true;
    if (jidNum && pNum && jidNum === pNum) return true;
    if (p.phoneNumber) {
      const pPhone = String(p.phoneNumber).replace(/\D/g, '');
      if (jidNum && pPhone && jidNum === pPhone) return true;
    }
    return false;
  });
}

async function resolveParticipantName(sock, userJid, metadata = null) {
  const cleanJid = normalizeUserJid(userJid);
  const userNum = normalizeNumber(cleanJid);
  try {
    if (typeof sock?.getName === 'function') {
      const name = await sock.getName(cleanJid);
      if (name) return String(name).trim();
    }
  } catch {}
  try {
    const found = findParticipant(metadata?.participants || [], userJid);
    const metaName = found?.notify || found?.name || found?.pushName;
    if (metaName) return String(metaName).trim();
  } catch {}
  return userNum ? `+${userNum}` : 'un usuario';
}

function getMessageText(msg = {}) {
  const m = msg.message || {};
  const fromText =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption || '';
  if (fromText) return fromText;
  const selectedId =
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId || '';
  if (selectedId) return selectedId;
  const paramsJson = m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (paramsJson) {
    try { const p = JSON.parse(paramsJson); return p?.id || p?.selectedId || ''; } catch {}
  }
  return '';
}

function getPrefixList() {
  const raw = settings.prefix || '.';
  if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean);
  return [String(raw || '.').trim() || '.'];
}

function getUsedPrefix(body = '') {
  return getPrefixList().find((p) => body.startsWith(p)) || '';
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clearAuthFolder() {
  try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
  try { fs.mkdirSync(SESSION_DIR, { recursive: true }); } catch {}
}

function hasPersistedSession() {
  try {
    const credsPath = path.join(SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) return false;
    const parsed = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    return Boolean(parsed?.registered || parsed?.me?.id);
  } catch { return false; }
}

function getReconnectDelay() {
  const attempts = Math.max(1, Math.min(8, reconnectAttempts + 1));
  reconnectAttempts = attempts;
  const base = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** (attempts - 1));
  const jitter = Math.floor(base * 0.2 * (Math.random() * 2 - 1));
  return Math.max(RECONNECT_CODE0_MIN_DELAY_MS, base + jitter);
}

function scheduleReconnect(ms = null) {
  if (reconnectTimer) return;
  const waitMs = ms !== null ? ms : getReconnectDelay();
  log('RECONECT', `Reintentando en ${c('byellow', `${Math.ceil(waitMs/1000)}s`)}... ${c('dim', `(intento #${reconnectAttempts})`)}`, 'yellow');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot().catch((e) => log('FATAL', String(e?.message || e), 'red'));
  }, waitMs);
  reconnectTimer.unref?.();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INICIO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

async function checkIsGroupAdmin(sock, groupId, senderJid, metadata = null) {
  try {
    const parts = metadata?.participants || [];
    const senderNum = String(senderJid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

    const byJid = parts.find(p => {
      const pId  = String(p.id || '');
      const pNum = pId.split('@')[0].split(':')[0].replace(/\D/g, '');
      return pId === senderJid || (senderNum && pNum && senderNum === pNum);
    });
    if (byJid) return Boolean(byJid.admin);

    let fullMeta = metadata;
    try { fullMeta = await sock.groupMetadata(groupId); } catch {}

    const fullParts = fullMeta?.participants || [];

    const byLidField = fullParts.find(p => {
      const pJid    = String(p.jid || p.lidJid || p.userJid || '');
      const pJidNum = pJid.split('@')[0].split(':')[0].replace(/\D/g, '');
      if (pJid && senderNum && pJidNum === senderNum) return true;
      const pPhone  = String(p.phoneNumber || p.phone || '').replace(/\D/g, '');
      if (pPhone && senderNum && pPhone === senderNum) return true;
      return false;
    });
    if (byLidField) return Boolean(byLidField.admin);

    const allAreLid = fullParts.length > 0 && fullParts.every(p => String(p.id || '').endsWith('@lid'));
    if (allAreLid) {
      try {
        const store    = sock.store || sock.authState?.store;
        const contacts = store?.contacts || sock.contacts || {};
        for (const [lidKey, contact] of Object.entries(contacts)) {
          const cNum = String(contact?.id || contact?.jid || lidKey || '')
            .split('@')[0].split(':')[0].replace(/\D/g, '');
          if (senderNum && cNum && cNum === senderNum) {
            const lidId = String(lidKey).includes('@') ? lidKey : `${lidKey}@lid`;
            const byStoreLid = fullParts.find(p => String(p.id || '') === lidId);
            if (byStoreLid) return Boolean(byStoreLid.admin);
          }
        }
      } catch {}
    }

    return false;
  } catch {
    return false;
  }
}

async function startBot() {
  if (booting) return;
  booting     = true;
  socketToken += 1;
  const token = socketToken;

  try {
    saveSettings({ ownerNumber: getOwnerNumbers(), authFolder: SESSION_DIR });
    printBanner();
    reloadCommands();

    if (!String(settings.apiBaseUrl || '').trim()) {
      saveSettings({ apiBaseUrl: DEFAULT_SETTINGS.apiBaseUrl, apiKey: DEFAULT_SETTINGS.apiKey });
    }

    fs.mkdirSync(SESSION_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const isRegistered = Boolean(state?.creds?.registered);

    log('SESSION', isRegistered
      ? `Sesión ${c('bgreen','existente')} — saltando vinculación.`
      : `Sin sesión — ${c('byellow','iniciando vinculación')}...`,
      isRegistered ? 'green' : 'yellow'
    );

    let selectedPhone = '';
    let isCodeMode    = false;

    if (!isRegistered) {
      if (isPairingCooldown()) {
        const waitMin = Math.ceil((pairingCooldownUntil - Date.now()) / 60000);
        log('PAIRING', c('bred', `Cooldown 405 activo. Espera aprox ${waitMin} min o usa modo QR.`), 'red');
        if (isPairingQrFallback()) {
          log('PAIRING', c('byellow', 'Modo QR activo por cooldown 405. Escanea el QR cuando aparezca.'), 'yellow');
          pairingMode = 'qr';
        } else {
          booting = false;
          scheduleReconnect(Math.max(30_000, pairingCooldownUntil - Date.now()));
          return;
        }
      }

      const savedMode  = String(settings.pairingMode || '').trim().toLowerCase();
      const savedPhone = normalizePhone(settings.phoneNumber || '');

      if (savedMode === 'code' && savedPhone) {
        pairingMode   = 'code';
        selectedPhone = savedPhone;
      } else if (savedMode === 'qr') {
        pairingMode = 'qr';
      } else {
        const result = await choosePairingMode();
        pairingMode   = result.mode;
        selectedPhone = result.phone;
      }

      isCodeMode = pairingMode === 'code' && !isPairingQrFallback();
    }

    let version = [2, 3000, 1027934701];
    try {
      const data = await fetchLatestBaileysVersion();
      if (Array.isArray(data?.version) && data.version.length >= 3) version = data.version;
    } catch {}

    log('BAILEYS', `@whiskeysockets/baileys v${version.join('.')} — Modo: ${c('bold', isCodeMode ? c('bgreen','CÓDIGO') : c('byellow','QR'))}`, 'blue');

    const browserConfig = isCodeMode
      ? ['Ubuntu', 'Chrome', '20.0.04']
      : ['Windows', 'Chrome', '114.0.5735.198'];

    let authConfig = state;
    if (typeof makeCacheableSignalKeyStore === 'function') {
      authConfig = {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      };
    }

    const sock = makeWASocket({
      version,
      printQRInTerminal:     !isCodeMode && !isRegistered,
      logger:                pino({ level: 'silent' }),
      auth:                  authConfig,
      browser:               browserConfig,
      connectTimeoutMs:      60_000,
      keepAliveIntervalMs:   30_000,
      defaultQueryTimeoutMs: undefined,
      markOnlineOnConnect:   false,
      syncFullHistory:       false,
    });

    sock.ev.on('creds.update', saveCreds);

    if (isCodeMode && !pairingRequested && !isRegistered && selectedPhone) {
      await delay(3000);
      if (token !== socketToken) return;

      try {
        const ready = await waitSocketReady(sock, PAIRING_SOCKET_WAIT_MS);
        if (!ready) {
          log('CODE', c('byellow', 'Socket aún inicializando, esperando 5s más...'), 'yellow');
          await delay(5000);
        }

        const code = await requestCodeWithRetry(sock, selectedPhone);
        cachePairingCode(code, selectedPhone);
        printCode(code);

      } catch (e) {
        resetPairingCache();
        const is405 = isPairingCooldown();
        log('CODE', `Error definitivo: ${c('bred', String(e?.message || e).slice(0, 80))}`, 'red');

        if (is405) {
          log('CODE', c('byellow', 'Cambiando a modo QR por cooldown 405...'), 'yellow');
          saveSettings({ pairingMode: 'qr', phoneNumber: '' });
          pairingMode = 'qr';
          if (token === socketToken) {
            booting = false;
            scheduleReconnect(3000);
            return;
          }
        } else {
          log('CODE', 'Limpiando sesión y volviendo al menú...', 'yellow');
          clearAuthFolder();
          saveSettings({ pairingMode: '', phoneNumber: '' });
          pairingMode = '';
          await delay(2000);
          if (token === socketToken) {
            booting = false;
            scheduleReconnect();
            return;
          }
        }
      }
    }

    sock.ev.on('connection.update', async (update) => {
      if (token !== socketToken) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr && !isCodeMode && !isRegistered) {
        if (isPairingQrFallback()) {
          log('QR', c('byellow', 'Modo QR activo por cooldown 405. Escanea el código QR de arriba.'), 'yellow');
        }
        console.log('');
        line('double', 'cyan');
        log('QR', cc('bold','bcyan','Código QR listo — escanea con WhatsApp'), 'cyan');
        log('QR', c('dim','  Ruta: Ajustes → Dispositivos vinculados → Escanear QR'), 'dim');
        if (isPairingQrFallback()) {
          log('QR', c('byellow', '  (Modo QR temporal por bloqueo 405 — escanea para evitar el límite por número)'), 'yellow');
        }
        line('double', 'cyan');
      }

      if (connection === 'open') {
        reconnectAttempts = 0;
        resetPairingCache();
        pairingCooldownUntil   = 0;
        pairingQrFallbackUntil = 0;
        const me = normalizeNumber(sock?.user?.id || '');

        if (me) saveSettings({ botNumber: me, pairingMode: '', phoneNumber: '' });
        pairingMode = '';
        printConnected(me);

        try {
          fs.mkdirSync(RUNTIME_DIR, { recursive: true });
          fs.writeFileSync(CONNECTED_FILE, JSON.stringify({
            connected:  true,
            at:         Date.now(),
            owners:     getOwnerNumbers(),
            botNumber:  me,
          }, null, 2));
        } catch {}

        return;
      }

      if (connection === 'close') {
        const err        = lastDisconnect?.error;
        const statusCode = new Boom(err)?.output?.statusCode || 0;
        const reason     = String(err?.message || 'desconocida').slice(0, 60);

        line('double', 'red');
        log('CLOSE', `Código ${c('bred', statusCode)} — ${c('dim', reason)}`, 'red');

        const loggedOut        = statusCode === 401 || statusCode === (DisconnectReason?.loggedOut ?? 401);
        const connReplaced     = statusCode === 440 || statusCode === (DisconnectReason?.connectionReplaced ?? 440);
        const restartRequired  = statusCode === 515 || statusCode === (DisconnectReason?.restartRequired ?? 515);
        const rejected405      = statusCode === 405;

        if (rejected405 && !isRegistered) {
          pairingCooldownUntil   = Date.now() + PAIRING_405_COOLDOWN_MS;
          pairingQrFallbackUntil = Date.now() + PAIRING_QR_FALLBACK_MS;
          const waitMin = Math.ceil(PAIRING_405_COOLDOWN_MS / 60000);
          log('PAIRING', c('bred', `WhatsApp rechazó con 405. Pausa de ${waitMin} min. Reconectando en modo QR...`), 'red');
          saveSettings({ pairingMode: 'qr', phoneNumber: '' });
          pairingMode = 'qr';
          scheduleReconnect(10_000);
          return;
        }

        if (loggedOut || connReplaced) {
          log('AUTH', 'Sesión cerrada remotamente. Limpiando y reiniciando...', 'red');
          clearAuthFolder();
          saveSettings({ pairingMode: '', phoneNumber: '' });
          pairingMode = '';
          resetPairingCache();
        }

        if (restartRequired) {
          reconnectAttempts = 0;
          log('RECONECT', 'Reinicio de stream solicitado. Reconectando...', 'yellow');
          scheduleReconnect(1200);
          return;
        }

        scheduleReconnect();
      }
    });

    sock.ev.on('group-participants.update', async (update) => {
      if (token !== socketToken) return;

      const { id: groupId, participants, action } = update;
      if (!groupId || !participants?.length) return;
      if (!['add', 'remove', 'leave'].includes(action)) return;

      const groupOpts = getGroupOptions(groupId);
      const isBienvenida = action === 'add' && groupOpts.bienvenida;
      const isDespdida   = (action === 'remove' || action === 'leave') && groupOpts.despedida;
      if (!isBienvenida && !isDespdida) return;

      let metadata   = null;
      let groupName  = 'el grupo';
      let groupImage = null;

      try {
        metadata  = await sock.groupMetadata(groupId);
        groupName = metadata?.subject || 'el grupo';
      } catch {}

      try {
        const ppUrl = await sock.profilePictureUrl(groupId, 'image');
        if (ppUrl) {
          const resp = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
          groupImage = Buffer.from(resp.data);
        }
      } catch {}

      for (const participant of participants) {
        let userJid = participant;
        let userNum = normalizeNumber(participant);

        if (!userNum && participant.includes('@lid')) {
          try {
            const store = sock.store || sock.authState?.store;
            const contacts = store?.contacts || sock.contacts || {};
            for (const [lidKey, contact] of Object.entries(contacts)) {
              const cId = String(contact?.id || contact?.jid || lidKey || '');
              if (cId === participant || cId.split('@')[0] === participant.split('@')[0]) {
                const cNum = String(contact?.phoneNumber || contact?.phone || contact?.id || '')
                  .split('@')[0].split(':')[0].replace(/\D/g, '');
                if (cNum) {
                  userNum = cNum;
                  userJid = `${cNum}@s.whatsapp.net`;
                  break;
                }
              }
            }
          } catch {}
        }

        if (!userNum) {
          try {
            const contact = await sock.onWhatsApp(participant);
            if (contact && contact.length > 0 && contact[0].jid) {
              const cNum = normalizeNumber(contact[0].jid);
              if (cNum) {
                userNum = cNum;
                userJid = contact[0].jid;
              }
            }
          } catch {}
        }

        if (!userNum) {
          userJid = participant;
          userNum = participant.split('@')[0].replace(/\D/g, '');
        }

        const displayName = await resolveParticipantName(sock, userJid, metadata);
        const mention = `@${userNum}`;

        if (isBienvenida) {
          const totalMembers = metadata?.participants?.length || 0;
          const fechaBienvenida = new Date().toLocaleDateString('es-PE', {
            day: '2-digit', month: 'long', year: 'numeric'
          });
          const welcomeText = groupOpts?.welcomeText;
          const welcomeImageB64 = groupOpts?.welcomeImage;

          let caption;
          if (welcomeText) {
            caption = welcomeText
              .replace(/{nombre}/gi, displayName)
              .replace(/{mencion}/gi, mention)
              .replace(/{grupo}/gi, groupName)
              .replace(/{miembros}/gi, String(totalMembers));
          } else {
            caption =
`❀ Bienvenido/a a *"_Maneki-Neko Bot_"*
✰ _Usuario_ » ${mention}
● Grupo » *${groupName}*
◆ _Ahora somos ${totalMembers} Miembros._
ꕥ Fecha » ${fechaBienvenida}
૮꒰ ˶• ᴗ •˶꒱ა ¡Disfruta tu estadía en el grupo!
> *➮ Usa _${String(settings.prefix || '.')}menu_ para ver la lista de comandos.*`;
          }

          let imgToSend = groupImage;
          if (welcomeImageB64) {
            try { imgToSend = Buffer.from(welcomeImageB64, 'base64'); } catch {}
          }

          try {
            if (groupImage) {
              await sock.sendMessage(groupId, { image: groupImage, caption, mentions: [userJid] });
            } else {
              await sock.sendMessage(groupId, { text: caption, mentions: [userJid] });
            }
          } catch (e) {
            log('ERR', `Bienvenida error: ${e?.message || e}`, 'red');
          }

        } else if (isDespdida) {
          const caption =
`╭━━━〔 👋 *DESPEDIDA* 〕━━━⬣

😢 *${displayName} ha salido*
🔖 ${mention}

📌 *Grupo:* ${groupName}
━━━━━━━━━━━━━━━━━━
💔 Lamentamos tu partida,
    esperamos verte de nuevo.

━━━━━━━━━━━━━━━━━━
💙 *MANEKI-NEKO BOT*`;

          try {
            if (groupImage) {
              await sock.sendMessage(groupId, { image: groupImage, caption, mentions: [userJid] });
            } else {
              await sock.sendMessage(groupId, { text: caption, mentions: [userJid] });
            }
          } catch (e) {
            log('ERR', `Despedida error: ${e?.message || e}`, 'red');
          }
        }
      }
    });

    // ── messages.upsert ──────────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (token !== socketToken) return;
      if (type !== 'notify') return;

      const m = messages?.[0];
      if (!m) return;

      const from      = m.key.remoteJid;
      const sender    = m.key.participant || from;
      const senderLid = m.key.participantLid || m.key?.['participantLid'] ||
                        m.message?.senderKeyDistributionMessage?.participantLid ||
                        m.participant?.lid || m?.participantLid || '';

      const body      = getMessageText(m).trim();
      const isGroup   = String(from || '').endsWith('@g.us');
      const groupOpts = isGroup ? getGroupOptions(from) : {};

      // ── Tracker de actividad por grupo (para comando .inactivos) ─────────────
      if (isGroup && sender && !String(sender).endsWith('@g.us')) {
        const senderNum = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');
        if (senderNum) {
          global.__groupActivity = global.__groupActivity || new Map();
          const groupKey = from;
          if (!global.__groupActivity.has(groupKey)) {
            global.__groupActivity.set(groupKey, new Map());
          }
          global.__groupActivity.get(groupKey).set(senderNum, Date.now());
        }
      }


      let metadata      = null;
      let senderIsAdmin = false;

      const needsMeta = groupOpts.antilink || groupOpts.modoadmin ||
        groupOpts.antispamSticker || groupOpts.antispamImagen ||
        groupOpts.antispamVideo   || groupOpts.antispamAudio;

      if (isGroup && needsMeta) {
        try {
          metadata      = await sock.groupMetadata(from);
          senderIsAdmin = await checkIsGroupAdmin(sock, from, sender, metadata);
        } catch {}
      }

      if (!isGroup && settings.antiPrivate && !isOwner(sender)) return;

      // ── Anti-spam ────────────────────────────────────────────────────────
      if (isGroup && !isOwner(sender)) {
        const msgType  = Object.keys(m.message || {})[0] || '';
        const spamMap  = {
          stickerMessage : 'antispamSticker',
          imageMessage   : 'antispamImagen',
          videoMessage   : 'antispamVideo',
          audioMessage   : 'antispamAudio',
          pttMessage     : 'antispamAudio',
        };
        const spamKey  = spamMap[msgType];
        if (spamKey && groupOpts[spamKey]) {
          let isAdmin = false;
          try {
            if (!metadata) metadata = await sock.groupMetadata(from);
            isAdmin = await checkIsGroupAdmin(sock, from, sender, metadata);
          } catch {}
          if (!isAdmin) {
            try { await sock.sendMessage(from, { delete: m.key }); } catch {}
            return;
          }
        }
      }

      // ── Anti-link ────────────────────────────────────────────────────────
      if (
        isGroup &&
        groupOpts.antilink &&
        /(chat\.whatsapp\.com\/|whatsapp\.com\/channel\/)/i.test(body)
      ) {
        if (!isOwner(sender) && !senderIsAdmin) {
          const userJid    = normalizeUserJid(sender);
          const allWarns   = typeof settings.antiLinkWarnings === 'object' ? settings.antiLinkWarnings : {};
          const groupWarns = typeof allWarns[from] === 'object' ? allWarns[from] : {};
          const next       = Number(groupWarns[userJid] || 0) + 1;

          groupWarns[userJid] = next;
          allWarns[from]      = groupWarns;
          saveSettings({ antiLinkWarnings: allWarns });

          try { await sock.sendMessage(from, { delete: m.key }); } catch {}

          if (next >= 3) {
            delete groupWarns[userJid];
            allWarns[from] = groupWarns;
            saveSettings({ antiLinkWarnings: allWarns });
            await sock.sendMessage(from, {
              text: `🚫 @${normalizeNumber(sender)} alcanzó *3/3 advertencias* y será expulsado.`,
              mentions: [sender],
            }, { quoted: m });
            try { await sock.groupParticipantsUpdate(from, [userJid], 'remove'); } catch {}
          } else {
            await sock.sendMessage(from, {
              text: `⚠️ @${normalizeNumber(sender)} enlace detectado. Advertencia: *${next}/3*`,
              mentions: [sender],
            }, { quoted: m });
          }
          return;
        }
      }

      // ── Procesar comando ─────────────────────────────────────────────────
      if (body.startsWith('.grupocerrar') || body.startsWith('.grupoabrir')) {
        const handled = await handleGroupScheduleCommand(sock, m, body);
        if (handled) return;
      }

      const usedPrefix  = getUsedPrefix(body);
      if (!usedPrefix) return;

      const args        = body.slice(usedPrefix.length).trim().split(/\s+/);
      const commandName = String(args.shift() || '').toLowerCase();
      if (!commandName) return;

      const cmd = global.comandos?.get(commandName);
      if (!cmd) return;

      const place         = isGroup ? 'GRUPO' : 'PRIVADO';
      const senderNum     = normalizeNumber(sender) || '???';
      const senderIsOwner = isOwner(sender);

      // ── Bot apagado en este grupo (excepto owner y el propio comando .bot) ──
      if (isGroup && groupOpts.botOff && !senderIsOwner && commandName !== 'bot') {
        return;
      }

      // ── Bloqueo si no está registrado (excepto owner y el propio .register) ──
      const BYPASS_REGISTER = new Set(['register', 'registro', 'reg', 'menu', 'help', 'comandos']);
      if (!senderIsOwner && !BYPASS_REGISTER.has(commandName) && !isRegistered(sender)) {
        const prefixUsado = String(settings.prefix || '.')?.[0] || '.';
        await sock.sendMessage(from, {
          text: `❌ No estás registrado.\n> Usa *${prefixUsado}register <nombre> <edad>* para acceder al bot.`
        }, { quoted: m });
        return;
      }

      log('CMD', `${cc('bold','bgreen', usedPrefix + commandName)} ${c('dim', `[${place}]`)} ${c('byellow', senderNum)}`, 'cyan');

      if (cmd.isOwner && !senderIsOwner) {
        await sock.sendMessage(from, { text: '❌ Solo el owner puede usar este comando.' }, { quoted: m });
        return;
      }

      if (cmd.group && !isGroup) {
        await sock.sendMessage(from, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: m });
        return;
      }

      if (cmd.admin) {
        if (!isGroup) {
          await sock.sendMessage(from, { text: '❌ Este comando requiere grupo y admin.' }, { quoted: m });
          return;
        }
        try {
          if (!metadata) metadata = await sock.groupMetadata(from);
          senderIsAdmin = await checkIsGroupAdmin(sock, from, sender, metadata);
        } catch (e) {
          log('ERR', `Admin check error: ${e?.message || e}`, 'red');
        }
        if (!senderIsOwner && !senderIsAdmin) {
          await sock.sendMessage(from, { text: '❌ Solo administradores pueden usar este comando.' }, { quoted: m });
          return;
        }
      }

      if (isGroup && groupOpts.modoadmin && !senderIsOwner && !senderIsAdmin) return;

      try {
        await cmd.run(sock, m, args, from, senderIsOwner, {
          commandName,
          settings,
          saveSettings: (patch = {}) => saveSettings(patch),
          prefix:       usedPrefix,
          prefixes:     getPrefixList(),
          axios,
          isOwner,
          ownerNumbers: getOwnerNumbers(),
          downloadMediaMessage,
          getContentType,
        });
      } catch (err) {
        log('ERR', `${c('bred', commandName)}: ${String(err?.message || err).slice(0, 100)}`, 'red');
        await sock.sendMessage(from, {
          text: `❌ *Error ejecutando el comando.*\n_Revisa la consola del bot._`,
        }, { quoted: m });
      }
    });

  } catch (err) {
    log('FATAL', c('bred', String(err?.message || err)), 'red');
    scheduleReconnect();
  } finally {
    booting = false;
  }
}


// ─── Usuarios registrados ─────────────────────────────────────────────────────
function getUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) || {};
  } catch { return {}; }
}

function isRegistered(jid = '') {
  const num = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (!num) return false;
  const users = getUsers();
  return Boolean(users[num]);
}

// ─── Persistencia de actividad de grupo ───────────────────────────────────────
function loadGroupActivity() {
  try {
    if (!fs.existsSync(ACTIVITY_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
    global.__groupActivity = global.__groupActivity || new Map();
    for (const [groupId, members] of Object.entries(raw || {})) {
      const memberMap = new Map();
      for (const [num, ts] of Object.entries(members || {})) {
        memberMap.set(num, Number(ts));
      }
      global.__groupActivity.set(groupId, memberMap);
    }
    log('INFO', `Actividad de grupos cargada desde activity.json`, 'cyan');
  } catch {}
}

function saveGroupActivity() {
  try {
    if (!global.__groupActivity) return;
    fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    const obj = {};
    for (const [groupId, members] of global.__groupActivity.entries()) {
      obj[groupId] = {};
      for (const [num, ts] of members.entries()) {
        obj[groupId][num] = ts;
      }
    }
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(obj));
  } catch {}
}

// Auto-guardado cada 5 minutos
setInterval(saveGroupActivity, 5 * 60 * 1000).unref?.();

// ─── Inicio ────────────────────────────────────────────────────────────────────
loadBaileys().then(() => {
  loadGroupActivity();
  startBot().catch((err) => log('FATAL', c('bred', String(err?.message || err)), 'red'));
});

// ─── Manejo de señales ────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  saveGroupActivity();
  try { rl?.close?.(); } catch {}
  console.log('\n' + c('bred', '  Bot apagado (SIGINT)'));
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  const msg = String(reason?.message || reason || '').toLowerCase();
  if (
    msg.includes('bad mac') ||
    msg.includes('sessioncipher') ||
    msg.includes('messagecountererror') ||
    msg.includes('key used already')
  ) return;
  log('ERR', `UnhandledRejection: ${String(reason?.message || reason).slice(0, 120)}`, 'red');
});

process.on('uncaughtException', (err) => {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('bad mac') || msg.includes('sessioncipher')) return;
  log('FATAL', `UncaughtException: ${String(err?.message || err).slice(0, 120)}`, 'red');
});

// ─── Schedulers de grupo ──────────────────────────────────────────────────────
const groupSchedules = global.__groupSchedules || (global.__groupSchedules = new Map());

function parseGroupSchedule(text = '') {
  const parts = String(text || '').trim().split(/\s+/);
  if (parts.length < 3) return null;

  const command  = parts[0].toLowerCase();
  const timeRaw  = parts[1];
  const timezone = parts.slice(2).join(' ');

  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(timeRaw);
  if (!match) return null;
  if (!moment.tz.zone(timezone)) return null;

  const mode = command === '.grupocerrar'
    ? 'announcement'
    : command === '.grupoabrir'
      ? 'not_announcement'
      : null;

  if (!mode) return null;

  return {
    mode,
    hour:     Number(match[1]),
    minute:   Number(match[2]),
    timezone,
  };
}

function scheduleGroupSetting(conn, chatId, mode, hour, minute, timezone) {
  const key = `${chatId}:${mode}`;

  const existing = groupSchedules.get(key);
  if (existing?.task) {
    existing.task.stop();
    existing.task.destroy?.();
  }

  const task = cron.schedule(
    `${minute} ${hour} * * *`,
    async () => {
      try {
        await conn.groupSettingUpdate(chatId, mode);
      } catch (err) {
        console.error(`[group-schedule] ${key}`, err?.message || err);
      }
    },
    { timezone }
  );

  groupSchedules.set(key, { task, mode, hour, minute, timezone, chatId });
  return true;
}

async function handleGroupScheduleCommand(conn, m, text) {
  const data = parseGroupSchedule(text);
  if (!data) return false;

  const chatId = m.chat || m.key?.remoteJid;
  if (!chatId) return false;

  scheduleGroupSetting(conn, chatId, data.mode, data.hour, data.minute, data.timezone);

  await conn.sendMessage(chatId, {
    text:
`╭━━━〔 ⏰ HORARIO DE GRUPO 〕━━━⬣

✅ Programado con éxito.

📌 Acción: *${data.mode === 'announcement' ? 'Cerrar grupo' : 'Abrir grupo'}*
🕒 Hora: *${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}*
🌍 Zona: *${data.timezone}*

━━━━━━━━━━━━━━━━━━
🐾 𝓜𝓪𝓷𝓮𝓴𝓲-𝓝𝓮𝓴𝓸 𝓑𝓸𝓽`,
  }, { quoted: m });

  return true;
}
