module.exports = {
  command: ['kiss', 'beso'],
  description: 'Le da un beso a la persona mencionada',
  categoria: 'anime',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings = ctx?.settings || {};
    const axios    = ctx?.axios;
    const apiBase  = String(settings.apiBaseUrl || '').trim();
    const apiKey   = String(settings.apiKey || '').trim();
    const prefix   = ctx?.prefix || '.';

    const senderJid = m.key.participant || m.key.remoteJid;

    let targetJid =
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      m.message?.extendedTextMessage?.contextInfo?.participant ||
      null;

    if (!targetJid) {
      const mentionArg = args.find(a => a.startsWith('@'));
      if (mentionArg) {
        const num = mentionArg.replace('@', '').replace(/\D/g, '');
        if (num) targetJid = `${num}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      await client.sendMessage(from, {
        text: `❌ Menciona a alguien o responde su mensaje.\n> Ejemplo: ${prefix}kiss @usuario`
      }, { quoted: m });
      return;
    }

    if (!apiBase || !apiKey) {
      await client.sendMessage(from, { text: '❌ La API no está configurada.' }, { quoted: m });
      return;
    }

    let imageUrl = '';

    try {
      const { data } = await axios.get(`${apiBase}/api/anime/kiss`, {
        params: { apiKey },
        timeout: 15000,
      });
      imageUrl = data?.url || '';
    } catch {
      await client.sendMessage(from, { text: '❌ Error al obtener la imagen.' }, { quoted: m });
      return;
    }

    if (!imageUrl) {
      await client.sendMessage(from, { text: '❌ No se pudo obtener la imagen.' }, { quoted: m });
      return;
    }

    const caption = `🐾 @${senderJid.split('@')[0]} le dio un beso a @${targetJid.split('@')[0]}`;

    try {
      await client.sendMessage(from, {
        image: { url: imageUrl },
        caption,
        mentions: [senderJid, targetJid],
      }, { quoted: m });
    } catch {
      await client.sendMessage(from, { text: '❌ Error al enviar la imagen.' }, { quoted: m });
    }
  },
};
