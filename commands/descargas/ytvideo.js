const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { pipeline } = require('stream/promises')
const { spawn } = require('child_process')

const VIGILANTE_API = 'https://elvigilante-api.onrender.com/api'
const VIGILANTE_KEY = 'elvigilante'
const VIDEO_QUALITY = '720p'
const TEMP_DIR = path.join(process.cwd(), 'tmp')

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })

const BORDER_TOP = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮'
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯'

const searchCache = {}

function safeFileName(n) {
  return String(n || 'video').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'video'
}

function extractYouTubeUrl(text) {
  const m = String(text || '').match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i)
  return m ? m[0].trim() : ''
}

async function descargarVideo(client, m, from, videoUrl, title) {
  try {
    const apiRes = await fetch(`${VIGILANTE_API}/download/ytvideo?url=${encodeURIComponent(videoUrl)}&quality=${VIDEO_QUALITY}&apiKey=${VIGILANTE_KEY}`)
    const json = await apiRes.json()
    if (!json.status || !json.result?.download_url) throw new Error('No se pudo obtener el video')

    const downloadUrl = json.result.download_url
    const finalTitle = safeFileName(json.result.title || title)
    const thumbnail = json.result.thumbnail || ''

    const rawFile = path.join(TEMP_DIR, `ytv_${Date.now()}.mp4`)
    const finalFile = path.join(TEMP_DIR, `ytv_final_${Date.now()}.mp4`)

    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'stream',
        timeout: 120000,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
        validateStatus: () => true,
        maxRedirects: 10
      })

      if (response.status >= 400) throw new Error('Error al descargar')

      let downloaded = 0
      response.data.on('data', chunk => {
        downloaded += chunk.length
        if (downloaded > 1500 * 1024 * 1024) response.data.destroy(new Error('Video demasiado grande'))
      })

      await pipeline(response.data, fs.createWriteStream(rawFile))

      if (!fs.existsSync(rawFile)) throw new Error('No se pudo guardar')
      const size = fs.statSync(rawFile).size
      if (!size || size < 1000) throw new Error('Video vacío')

      if (size > 70 * 1024 * 1024) {
        await client.sendMessage(from, {
          document: fs.readFileSync(rawFile),
          mimetype: 'video/mp4',
          fileName: `${finalTitle}.mp4`,
          caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${finalTitle}\n⊹ 📦 Documento (archivo grande)\n⊹ 🎚️ ${VIDEO_QUALITY}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      } else {
        try {
          await client.sendMessage(from, {
            video: fs.readFileSync(rawFile),
            mimetype: 'video/mp4',
            caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${finalTitle}\n⊹ 🎚️ ${VIDEO_QUALITY}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
          }, { quoted: m })
        } catch {
          await new Promise((resolve, reject) => {
            const ff = spawn('ffmpeg', [
              '-y', '-i', rawFile,
              '-vf', 'scale=640:trunc(ow/a/2)*2',
              '-c:v', 'libx264', '-b:v', '800k', '-preset', 'fast',
              '-c:a', 'aac', '-b:a', '128k',
              '-movflags', '+faststart', '-loglevel', 'error',
              finalFile
            ], { stdio: ['ignore', 'ignore', 'pipe'] })
            ff.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg error')))
            ff.on('error', reject)
          })

          const filePath = fs.existsSync(finalFile) ? finalFile : rawFile
          await client.sendMessage(from, {
            video: fs.readFileSync(filePath),
            mimetype: 'video/mp4',
            caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${finalTitle}\n⊹ 🎚️ ${VIDEO_QUALITY}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
          }, { quoted: m })
        }
      }
    } finally {
      try { fs.unlinkSync(rawFile) } catch {}
      try { fs.unlinkSync(finalFile) } catch {}
    }

    if (thumbnail) {
      await client.sendMessage(from, {
        image: { url: thumbnail },
        caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${finalTitle}\n⊹ 🎚️ ${VIDEO_QUALITY}\n⊹ 🎬 API Oficial de El Vigilante\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }

  } catch (e) {
    console.error('[YTVIDEO ERROR]', e.message)
    await client.sendMessage(from, {
      text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ Estado: ❌ Error\n⊹ ${e.message || 'No se pudo descargar'}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
    }, { quoted: m })
  }
}

module.exports = {
  command: ['ytvideo', 'ytmp4', 'video', 'ytv'],
  description: 'Descarga videos de YouTube en 720p',
  categoria: 'descargas',

  run: async (client, m, args, from) => {
    const input = args.join(' ').trim()

    const num = parseInt(input)
    if (!isNaN(num) && input === String(num)) {
      const cache = searchCache[from]
      if (!cache || Date.now() > cache.timeout) {
        delete searchCache[from]
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ La búsqueda expiró\n⊹ Vuelve a buscar primero\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }
      if (num < 1 || num > cache.resultados.length) {
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Número inválido\n⊹ Elige entre 1-${cache.resultados.length}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }

      const video = cache.resultados[num - 1]
      delete searchCache[from]

      const sent = await client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ⏳ ᴅᴇsᴄᴀʀɢᴀɴᴅᴏ...\n${BORDER_BOTTOM}`
      }, { quoted: m })

      return descargarVideo(client, m, from, video.url, video.title)
    }

    if (!input) {
      return client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Descarga videos de YouTube\n⊹ Calidad: ${VIDEO_QUALITY}\n\n> .ytvideo <nombre o link>\n> .ytvideo Naruto Opening 1\n> .ytvideo <número> para elegir\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }

    const sent = await client.sendMessage(from, {
      text: `${BORDER_TOP}\n       🔍 ʙᴜsᴄᴀɴᴅᴏ...\n${BORDER_BOTTOM}`
    }, { quoted: m })

    const linkDirecto = extractYouTubeUrl(input)

    if (linkDirecto) {
      return descargarVideo(client, m, from, linkDirecto, 'video')
    }

    try {
      const res = await fetch(`${VIGILANTE_API}/search/youtube?apiKey=${VIGILANTE_KEY}&query=${encodeURIComponent(input)}`)
      const data = await res.json()
      if (!data.status || !data.data?.length) throw new Error('Sin resultados')

      const resultados = data.data.slice(0, 10)

      if (resultados.length === 1) {
        return descargarVideo(client, m, from, resultados[0].url, resultados[0].title)
      }

      searchCache[from] = {
        resultados,
        timeout: Date.now() + 120000
      }

      let lista = ''
      resultados.forEach((v, i) => {
        lista += `\n⊹ ${i + 1}. ${String(v.title || '').slice(0, 40)}`
        lista += `\n   ⏱️ ${v.duration || '?'} | 👁️ ${v.views || '?'} | 👤 ${String(v.author || 'Desconocido').slice(0, 18)}`
      })

      await client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Búsqueda: ${input}\n⊹ ${resultados.length} resultados${lista}\n\n> .ytvideo <número>\n> Ejemplo: .ytvideo 1\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })

    } catch (e) {
      await client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Estado: ❌ Sin resultados\n⊹ Prueba con otro nombre\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }
  }
}