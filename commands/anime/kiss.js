const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮'
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯'

module.exports = {
  command: ['kiss', 'beso'],
  description: 'Dale un beso a alguien 💋',
  categoria: 'anime',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const axios = ctx?.axios || require('axios')
    const mencionados = m.mentionedJid || []
    const target = mencionados[0] || m.quoted?.sender || m.sender
    const sender = m.sender
    const nombreTarget = target ? `@${target.split('@')[0]}` : '@desconocido'
    const nombreSender = sender ? `@${sender.split('@')[0]}` : '@alguien'

    let caption = ''
    if (target === sender || mencionados.length === 0) {
      caption = `💋 ${nombreSender} pide un beso 💋`
    } else {
      caption = `💋 ${nombreSender} besó a ${nombreTarget} 💋`
    }

    try {
      const { data } = await axios.get('https://elvigilante-api.onrender.com/api/anime/kiss', {
        params: { apiKey: 'elvigilante' },
        timeout: 15000
      })

      if (!data?.url) throw new Error('Sin media')

      await client.sendMessage(from, {
        image: { url: data.url },
        caption: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n${caption}\n\n${BORDER_TOP}\n       🐾 Anime\n${BORDER_BOTTOM}`,
        mentions: target === sender ? [sender] : [sender, target]
      }, { quoted: m })
    } catch (e) {
      await client.sendMessage(from, { text: '❌ No se pudo obtener la reacción.' }, { quoted: m })
    }
  }
}
