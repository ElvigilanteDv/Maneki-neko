const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEMP_DIR = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const REQUEST_TIMEOUT = 120000;
const MAX_VIDEO_BYTES = 1500 * 1024 * 1024;
const VIDEO_AS_DOCUMENT_THRESHOLD = 70 * 1024 * 1024;
const VIDEO_QUALITY = '720p';

const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

function safeFileName(name) {
  return String(name || 'media').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'media';
}
function isHttpUrl(v) { return /^https?:\/\//i.test(String(v || '')); }
function extractYouTubeUrl(text) {
  const m = String(text || '').match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i);
  return m ? m[0].trim() : '';
}
function normalizeMp4Name(name) {
  const clean = safeFileName(String(name || 'video').replace(/\.mp4$/i, ''));
  return `${clean || 'video'}.mp4`;
}
function deleteFileSafe(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
}
function parseContentDisposition(h) {
  const t = String(h || '');
  const u = t.match(/filename\*=UTF-8''([^;]+)/i);
  if (u?.[1]) { try { return decodeURIComponent(u[1]).replace(/["']/g, '').trim(); } catch {} }
  const n = t.match(/filename="?([^"]+)"?/i);
  return n?.[1]?.trim() || '';
}
async function readStreamToText(stream) {
  return new Promise((res, rej) => {
    let d = '';
    stream.on('data', c => (d += c.toString()));
    stream.on('end', () => res(d));
    stream.on('error', rej);
  });
}

function headerCaption(title) {
  return `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n【 ${title} 】\n\n`;
}
function footerCaption() {
  return `\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`;
}

async function downloadVideo(axios, downloadUrl, outputPath) {
  const { pipeline } = require('stream/promises');
  const response = await axios.get(downloadUrl, {
    responseType: 'stream', timeout: REQUEST_TIMEOUT,
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
    validateStatus: () => true, maxRedirects: 10,
  });
  if (response.status >= 400) {
    const err = await readStreamToText(response.data).catch(() => '');
    throw new Error(err || 'Error al descargar el video');
  }
  let downloaded = 0;
  response.data.on('data', chunk => {
    downloaded += chunk.length;
    if (downloaded > MAX_VIDEO_BYTES) response.data.destroy(new Error('Video demasiado grande'));
  });
  try { await pipeline(response.data, fs.createWriteStream(outputPath)); }
  catch (e) { deleteFileSafe(outputPath); throw e; }
  if (!fs.existsSync(outputPath)) throw new Error('No se pudo guardar el video');
  const size = fs.statSync(outputPath).size;
  if (!size || size < 150000) { deleteFileSafe(outputPath); throw new Error('Video inválido o vacío'); }
  const fromHeader = parseContentDisposition(response.headers?.['content-disposition']);
  return { size, fileName: normalizeMp4Name(fromHeader || 'video.mp4') };
}

async function normalizeForWhatsApp(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', 'scale=640:trunc(ow/a/2)*2',
      '-c:v', 'libx264', '-b:v', '800k', '-preset', 'fast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart', '-loglevel', 'error',
      outputPath
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    ff.on('error', reject);
    ff.on('close', code => { if (code === 0) resolve(true); else reject(new Error('ffmpeg error')); });
  });
}

async function sendVideo(client, m, from, videoUrl, title, apiBase, apiKey, axios) {
  const { data: json } = await axios.get(`${apiBase}/api/download/ytvideo`, {
    params: { url: videoUrl, quality: VIDEO_QUALITY, apiKey },
    timeout: REQUEST_TIMEOUT,
  });
  if (!json.status || !json.result?.download_url) throw new Error('No se pudo obtener el video');

  const downloadUrl = json.result.download_url;
  const finalTitle = safeFileName(json.result.title || title);
  const rawFile = path.join(TEMP_DIR, `yt_${Date.now()}.mp4`);
  const finalFile = path.join(TEMP_DIR, `yt_final_${Date.now()}.mp4`);

  try {
    const videoInfo = await downloadVideo(axios, downloadUrl, rawFile);
    const finalName = normalizeMp4Name(videoInfo.fileName || finalTitle);

    if (videoInfo.size > VIDEO_AS_DOCUMENT_THRESHOLD) {
      await client.sendMessage(from, {
        document: fs.readFileSync(rawFile), mimetype: 'video/mp4',
        fileName: finalName, caption: `🎬 ${finalTitle}`
      }, { quoted: m });
    } else {
      try {
        await client.sendMessage(from, {
          video: fs.readFileSync(rawFile), mimetype: 'video/mp4',
          fileName: finalName, caption: `🎬 ${finalTitle}`
        }, { quoted: m });
      } catch {
        await normalizeForWhatsApp(rawFile, finalFile);
        const filePath = fs.existsSync(finalFile) ? finalFile : rawFile;
        await client.sendMessage(from, {
          video: fs.readFileSync(filePath), mimetype: 'video/mp4',
          fileName: finalName, caption: `🎬 ${finalTitle}`
        }, { quoted: m });
      }
    }
  } finally {
    deleteFileSafe(rawFile);
    deleteFileSafe(finalFile);
  }
  return finalTitle;
}

async function descargarVideo(client, m, from, videoUrl, title, ctx) {
  const settings = ctx?.settings || {};
  const axios    = ctx?.axios;
  const apiBase  = String(settings.apiBaseUrl || '').trim();
  const apiKey   = String(settings.apiKey || '').trim();

  await client.sendMessage(from, {
    text: `${headerCaption('ᴅᴇꜱᴄᴀʀɢᴀɴᴅᴏ')}⊹ ${title}\n⊹ Calidad: ${VIDEO_QUALITY}\n\n> Espera un momento...${footerCaption()}`
  }, { quoted: m });

  try {
    const finalTitle = await sendVideo(client, m, from, videoUrl, title, apiBase, apiKey, axios);
    await client.sendMessage(from, {
      text: `${headerCaption('ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ')}⊹ ${finalTitle || title}\n⊹ Descarga finalizada✦${footerCaption()}`
    }, { quoted: m });
  } catch (e) {
    const rawMsg = String(e?.message || '').toLowerCase();
    const humanMsg = (rawMsg.includes('502') || rawMsg.includes('503') || rawMsg.includes('bad gateway'))
      ? `${headerCaption('ꜱᴇʀᴅᴏʀ ꜱᴀᴛᴜʀᴀᴅᴏ')}⊹ Intenta más tarde${footerCaption()}`
      : `${headerCaption('ᴇʀʀᴏʀ')}⊹ ${e.message || 'Error al descargar'}${footerCaption()}`;
    await client.sendMessage(from, { text: humanMsg }, { quoted: m });
  }
}

module.exports = {
  command: ['yt2', 'ytmp4v2', 'video2'],
  description: 'Descarga videos de YouTube con miniatura y lista de resultados',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings = ctx?.settings || {};
    const axios    = ctx?.axios;
    const apiBase  = String(settings.apiBaseUrl || '').trim();
    const apiKey   = String(settings.apiKey || '').trim();
    const prefix   = ctx?.prefix || '.';

    const firstArg = args[0];
    const isNumberChoice = /^([1-9]|10)$/.test(firstArg || '');

    if (isNumberChoice) {
      const index = parseInt(firstArg, 10) - 1;
      const cache = global.yt2SearchCache;
      const cached = cache?.get(from);

      if (!cached) {
        await client.sendMessage(from, { text: `${headerCaption('ᴇʀʀᴏʀ')}⊹ No hay una búsqueda activa\n> Usa ${prefix}yt2 <nombre> primero${footerCaption()}` }, { quoted: m });
        return;
      }

      if (!cached.results[index]) {
        await client.sendMessage(from, { text: `${headerCaption('ᴇʀʀᴏʀ')}⊹ No existe el resultado #${firstArg}${footerCaption()}` }, { quoted: m });
        return;
      }

      const selected = cached.results[index];
      await descargarVideo(client, m, from, selected.url, selected.title, ctx);
      return;
    }

    const input = args.join(' ').trim();

    if (!input) {
      await client.sendMessage(from, {
        text: `${headerCaption('ʏᴏᴜᴛᴜʙᴇ')}⊹ Descarga videos de YouTube\n\n> ${prefix}yt2 <nombre o link>\n> Ejemplo: ${prefix}yt2 Naruto Opening 1${footerCaption()}`
      }, { quoted: m });
      return;
    }

    if (isHttpUrl(input) && !extractYouTubeUrl(input)) {
      await client.sendMessage(from, { text: `${headerCaption('ᴇʀʀᴏʀ')}⊹ Envía un link válido de YouTube${footerCaption()}` }, { quoted: m });
      return;
    }

    if (!apiBase || !apiKey) {
      await client.sendMessage(from, { text: `${headerCaption('ᴇʀʀᴏʀ')}⊹ La API no está configurada${footerCaption()}` }, { quoted: m });
      return;
    }

    if (extractYouTubeUrl(input)) {
      const videoUrl = extractYouTubeUrl(input);
      await descargarVideo(client, m, from, videoUrl, 'video', ctx);
      return;
    }

    try {
      const { data } = await axios.get(`${apiBase}/api/search/youtube`, {
        params: { apiKey, query: input },
        timeout: 15000,
      });
      if (!data.status || !data.data?.length) throw new Error('No se encontraron resultados');

      const resultados = data.data.slice(0, 10);

      global.yt2SearchCache = global.yt2SearchCache || new Map();
      global.yt2SearchCache.set(from, { results: resultados, at: Date.now() });
      setTimeout(() => {
        const c = global.yt2SearchCache?.get(from);
        if (c && Date.now() - c.at >= 5 * 60 * 1000) global.yt2SearchCache.delete(from);
      }, 5 * 60 * 1000);

      let lista = '';
      resultados.forEach((v, i) => {
        lista += `⊹ ${i + 1}. ${v.title}\n> ${v.duration || '?'} ⊹ ${v.views || '?'} ⊹ ${v.author || 'Desconocido'}\n`;
      });

      const caption =
`${headerCaption('ʀᴇꜱᴜʟᴛᴀᴅᴏꜱ')}⊹ Búsqueda: ${input}

${lista}
⊹ Responde con: ${prefix}yt2 <número>${footerCaption()}`;

      if (resultados[0]?.thumbnail) {
        try {
          await client.sendMessage(from, { image: { url: resultados[0].thumbnail }, caption }, { quoted: m });
        } catch {
          await client.sendMessage(from, { text: caption }, { quoted: m });
        }
      } else {
        await client.sendMessage(from, { text: caption }, { quoted: m });
      }
    } catch (e) {
      await client.sendMessage(from, { text: `${headerCaption('ᴇʀʀᴏʀ')}⊹ ${e.message}${footerCaption()}` }, { quoted: m });
    }
  },
};
