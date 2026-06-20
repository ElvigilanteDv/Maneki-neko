const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function deleteFileSafe(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
}

function getMediaFromMessage(m) {
  const msg = m.message || {};

  if (msg.imageMessage) return { type: 'image', msg: msg.imageMessage };
  if (msg.videoMessage) return { type: 'video', msg: msg.videoMessage };
  if (msg.stickerMessage) return { type: 'sticker', msg: msg.stickerMessage };

  const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage || {};
  if (quoted.imageMessage) return { type: 'image', msg: quoted.imageMessage };
  if (quoted.videoMessage) return { type: 'video', msg: quoted.videoMessage };
  if (quoted.stickerMessage) return { type: 'sticker', msg: quoted.stickerMessage };

  return null;
}

function convertToSticker(inputPath, outputPath, animated = false) {
  return new Promise((resolve, reject) => {
    const filters = 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2';
    const args = animated
      ? ['-y', '-i', inputPath, '-vf', filters, '-t', '00:00:10', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0', outputPath]
      : ['-y', '-i', inputPath, '-vf', filters, '-preset', 'default', '-an', outputPath];

    const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    ff.on('error', reject);
    ff.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`ffmpeg salió con código ${code}`));
    });
  });
}

module.exports = {
  command: ['sticker', 's', 'stiker'],
  description: 'Convierte una imagen o video en sticker',
  categoria: 'herramientas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix = ctx?.prefix || '.';
    const downloadMediaMessage = ctx?.downloadMediaMessage;

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const media = getMediaFromMessage(m);

    if (!media) {
      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Sticker Creator_
${BORDER_BOTTOM}

• Uso correcto:
➜ Envía una imagen con ${prefix}sticker
➜ Responde a una imagen con ${prefix}sticker
➜ Responde a un video corto con ${prefix}sticker

• El sticker se generará automáticamente.`
      }, { quoted: m });
      return;
    }

    if (media.type === 'video') {
      const duration = media.msg?.seconds || 0;
      if (duration > 10) {
        await client.sendMessage(from, {
          text: '❌ El video no puede durar más de 10 segundos para sticker.'
        }, { quoted: m });
        return;
      }
    }

    await client.sendMessage(from, { text: '⏳ Convirtiendo...' }, { quoted: m });

    const ext = media.type === 'video' ? 'mp4' : 'jpg';
    const inputPath  = path.join(TEMP_DIR, `stk_in_${Date.now()}.${ext}`);
    const outputPath = path.join(TEMP_DIR, `stk_out_${Date.now()}.webp`);

    try {
      let buffer;

      if (typeof downloadMediaMessage === 'function') {
        buffer = await downloadMediaMessage(m, 'buffer', {});
      } else {
        const { downloadMediaMessage: dlMedia } = await import('@whiskeysockets/baileys');
        buffer = await dlMedia(m, 'buffer', {});
      }

      if (!buffer || !buffer.length) throw new Error('No se pudo descargar el archivo');

      fs.writeFileSync(inputPath, buffer);

      const animated = media.type === 'video';
      await convertToSticker(inputPath, outputPath, animated);

      if (!fs.existsSync(outputPath)) throw new Error('No se generó el sticker');

      await client.sendMessage(from, {
        sticker: fs.readFileSync(outputPath),
      }, { quoted: m });
    } catch (e) {
      await client.sendMessage(from, {
        text: `❌ Error al crear el sticker.\n> ${e.message || 'Error desconocido'}`
      }, { quoted: m });
    } finally {
      deleteFileSafe(inputPath);
      deleteFileSafe(outputPath);
    }
  },
};