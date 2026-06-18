const fetch = require('node-fetch')

const VIGILANTE_API = 'https://elvigilante-api.onrender.com'
const VIGILANTE_KEY = 'elvigilante'
const VIDEO_QUALITY = '720p'

const BORDER_TOP = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮'
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯'

const searchCache = {}

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
    const finalTitle = json.result.title || title
    const thumbnail = json.result.thumbnail || ''

    await client.sendMessage(from, {
      video: { url: downloadUrl },
      mimetype: 'video/mp4',
      caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${finalTitle}\n⊹ 🎚️ ${VIDEO_QUALITY}\n⊹ 🎬 API Oficial de El Vigilante\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
    }, { quoted: m })

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

      return descargarVideo(client, m, from, video.url, video.title)
    }

    if (!input) {
      return client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Descarga videos de YouTube\n⊹ Calidad: ${VIDEO_QUALITY}\n\n> .ytvideo <nombre o link>\n> .ytvideo Naruto Opening 1\n> .ytvideo <número> para elegir\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }

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