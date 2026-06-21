'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execFileSync } = require('child_process');

// ─── Carpeta temporal única por conversión ─────────────────────────────────────
function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'maneki-sticker-'));
  return dir;
}

// ─── Obtiene el mensaje actual o el citado (quoted), el que tenga media ───────
function getQuotedOrCurrentMessage(m) {
  const msg = m?.message || {};

  if (msg.imageMessage || msg.videoMessage || msg.stickerMessage) {
    return m;
  }

  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted && (quoted.imageMessage || quoted.videoMessage || quoted.stickerMessage)) {
    const stanzaId   = msg.extendedTextMessage.contextInfo.stanzaId;
    const participant = msg.extendedTextMessage.contextInfo.participant;
    return {
      key: {
        remoteJid: m.key?.remoteJid,
        id: stanzaId,
        participant,
        fromMe: false,
      },
      message: quoted,
    };
  }

  // Sin media válida: devolvemos el mensaje original tal cual,
  // para que getMimeType detecte que no hay imagen/video.
  return m;
}

// ─── Detecta el mimetype del mensaje objetivo ─────────────────────────────────
function getMimeType(getContentType, target) {
  try {
    const msg = target?.message || {};

    if (msg.imageMessage)   return msg.imageMessage.mimetype   || 'image/jpeg';
    if (msg.videoMessage)   return msg.videoMessage.mimetype   || 'video/mp4';
    if (msg.stickerMessage) return msg.stickerMessage.mimetype || 'image/webp';

    if (typeof getContentType === 'function') {
      const type = getContentType(msg);
      if (type === 'imageMessage') return msg.imageMessage?.mimetype || 'image/jpeg';
      if (type === 'videoMessage') return msg.videoMessage?.mimetype || 'video/mp4';
      if (type === 'stickerMessage') return msg.stickerMessage?.mimetype || 'image/webp';
    }
  } catch {}
  return '';
}

// ─── Descarga el buffer del media del mensaje objetivo ────────────────────────
async function downloadMediaBuffer(ctx, client, m) {
  const target = getQuotedOrCurrentMessage(m);
  const downloadMediaMessage = ctx?.downloadMediaMessage;

  if (typeof downloadMediaMessage === 'function') {
    const buffer = await downloadMediaMessage(target, 'buffer', {});
    if (Buffer.isBuffer(buffer) && buffer.length) return buffer;
  }

  // Fallback: importar directo desde el fork de Baileys
  const { downloadMediaMessage: dlMedia } = await import('@whiskeysockets/baileys');
  const buffer = await dlMedia(target, 'buffer', {});
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('No se pudo descargar el archivo multimedia');
  }
  return buffer;
}

// ─── Convierte un buffer de imagen/video a sticker WEBP ───────────────────────
function ffmpegToWebp(inputBuffer, { inputExt = 'bin', video = false } = {}) {
  const tempDir = makeTempDir();
  const inputFile = path.join(tempDir, `input.${inputExt}`);
  const outputFile = path.join(tempDir, 'output.webp');

  try {
    fs.writeFileSync(inputFile, inputBuffer);

    const args = [
      '-y',
      '-i', inputFile,
      '-vcodec', 'libwebp',
      '-vf',
      'fps=15,scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-lossless', '1',
      '-qscale', '50',
      '-preset', 'default',
      '-pix_fmt', 'yuva420p',
      '-loop', '0',
      '-an',
      '-vsync', '0'
    ];

    if (video) {
      args.push('-t', '7');
    }

    args.push(outputFile);

    execFileSync('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });

    const result = fs.readFileSync(outputFile);

    if (!result || result.length < 100) {
      throw new Error('WEBP inválido');
    }

    return result;
  } finally {
    try {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true
      });
    } catch {}
  }
}

module.exports = {
  makeTempDir,
  getQuotedOrCurrentMessage,
  getMimeType,
  downloadMediaBuffer,
  ffmpegToWebp,
};
