const axios = require('axios')

const VIGILANTE_API = 'https://elvigilante-api.onrender.com'
const VIGILANTE_KEY = 'elvigilante'
const VIDEO_QUALITY = '720p'

const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮'
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯'

const searchCache = new Map()

function extractYouTubeUrl(text) {
  const m = String(text || '').match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i)
  return m ? m[0].trim() : ''
}

async function descargarYEnviar(client, m, from, selected) {
  await client.sendMessage(from, {
    text: `${BORDER_TOP}\n       ⏳ ᴅᴇsᴄᴀʀɢᴀɴᴅᴏ...\n${BORDER_BOTTOM}`
  }, { quoted: m })

  try {
    const { data } = await axios.get(`${VIGILANTE_API}/download/ytvideo`, {
      params: {
        url: selected.url,
        quality: VIDEO_QUALITY,
        apiKey: VIGILANTE_KEY
      },
      timeout: 30000
    })

    const downloadUrl = data?.result?.download_url
    const title = data?.result?.title || selected.title

    if (!downloadUrl) {
      throw new Error('No se obtuvo enlace de descarga')
    }

    await client.sendMessage(from, {
      video: { url: downloadUrl },
      mimetype: 'video/mp4',
      caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ 🎬 ${title}\n⊹ 🎚️ ${VIDEO_QUALITY}\n⊹ 🎬 API Oficial de El Vigilante\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
    }, { quoted: m })

  } catch (e) {
    console.error('[YTVIDEO ERROR]', e.message)
    await client.sendMessage(from, {
      text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴠɪᴅᴇᴏ ᴅᴇsᴄᴀʀɢᴀᴅᴏ 』\n\n⊹ Estado: ❌ Error\n⊹ ${e.message || 'No se pudo descargar'}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
    }, { quoted: m })
  }
}

module.exports = {
  command: ['ytvideo', 'ytmp4', 'video', 'ytv', 'play2'],
  description: 'Busca y descarga videos de YouTube en 720p',
  categoria: 'descargas',

  run: async (client, m, args, from) => {
    const input = args.join(' ').trim()

    const num = parseInt(input)
    if (!isNaN(num) && input === String(num)) {
      const cache = searchCache.get(from)
      if (!cache || Date.now() > cache.timeout) {
        searchCache.delete(from)
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ La búsqueda expiró\n⊹ Vuelve a buscar primero\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }
      if (num < 1 || num > cache.results.length) {
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Número inválido\n⊹ Elige entre 1-${cache.results.length}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }

      const video = cache.results[num - 1]
      searchCache.delete(from)
      return descargarYEnviar(client, m, from, video)
    }

    if (input === 'aleatorio' || input === 'random') {
      const cache = searchCache.get(from)
      if (!cache) {
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ No hay búsqueda activa\n⊹ Busca algo primero\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }
      const randomIndex = Math.floor(Math.random() * cache.results.length)
      const video = cache.results[randomIndex]
      searchCache.delete(from)
      return descargarYEnviar(client, m, from, video)
    }

    if (!input) {
      return client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Descarga videos de YouTube\n⊹ Calidad: ${VIDEO_QUALITY}\n\n> .ytvideo <nombre o link>\n> .ytvideo <número>\n> .ytvideo aleatorio\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }

    const linkDirecto = extractYouTubeUrl(input)
    if (linkDirecto) {
      return descargarYEnviar(client, m, from, { url: linkDirecto, title: 'Video de YouTube' })
    }

    try {
      const { data } = await axios.get(`${VIGILANTE_API}/search/youtube`, {
        params: { apiKey: VIGILANTE_KEY, query: input },
        timeout: 15000
      })

      const results = Array.isArray(data?.data) ? data.data.slice(0, 10) : []

      if (!results.length) {
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Estado: ❌ Sin resultados\n⊹ Prueba con otro nombre\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m })
      }

      if (results.length === 1) {
        return descargarYEnviar(client, m, from, results[0])
      }

      searchCache.set(from, {
        results,
        timeout: Date.now() + 300000
      })

      let lista = ''
      results.forEach((v, i) => {
        lista += `\n⊹ ${i + 1}. ${String(v.title || '').slice(0, 40)}`
        lista += `\n   ⏱️ ${v.duration || '?'} | 👁️ ${v.views || '?'} | 👤 ${String(v.author || 'Desconocido').slice(0, 18)}`
      })

      await client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Búsqueda: ${input}\n⊹ ${results.length} resultados${lista}\n\n> .ytvideo <número>\n> .ytvideo aleatorio\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })

    } catch (e) {
      console.error('[YTVIDEO ERROR]', e.message)
      await client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ʏᴏᴜᴛᴜʙᴇ ᴠɪᴅᴇᴏ 』\n\n⊹ Estado: ❌ Error al buscar\n⊹ ${e.message}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m })
    }
  }
}