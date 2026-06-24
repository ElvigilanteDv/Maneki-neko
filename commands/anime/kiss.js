module.exports = {
  command: ['kiss', 'besar', 'beso'],
  description: 'Envía un beso a la persona mencionada',
  categoria: 'anime',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const { axios } = ctx;

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
    const sender = m.key.participant || m.key.remoteJid;

    let target = null;

    if (mentioned.length > 0) {
      target = mentioned[0];
    } else if (quoted) {
      target = quoted;
    } else {
      const mentionArg = args.find(a => a.startsWith('@'));
      if (mentionArg) {
        const num = mentionArg.replace('@', '').replace(/\D/g, '');
        if (num) target = `${num}@s.whatsapp.net`;
      }
    }

    if (!target) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Kiss_
${BORDER_BOTTOM}

➜ Uso correcto:
  • .kiss @usuario
  • Responde a un mensaje con .kiss

➜ El bot enviará un beso a la persona.`
      }, { quoted: m });
    }

    try {
      const { data } = await axios.get('https://api.delirius.store/reactions/kiss', {
        timeout: 10000
      });

      if (!data.status || !data.data || !data.data.url) {
        throw new Error('No se pudo obtener el video');
      }

      const videoUrl = data.data.url;
      const senderNum = sender.split('@')[0];
      const targetNum = target.split('@')[0];

      const caption =
`${BORDER_TOP}
       _Beso_
${BORDER_BOTTOM}

➜ @${senderNum} le dio un beso a @${targetNum}`;

      await client.sendMessage(from, {
        video: { url: videoUrl },
        caption: caption,
        mentions: [sender, target]
      }, { quoted: m });

    } catch (error) {
      console.error('Error en kiss:', error);
      await client.sendMessage(from, {
        text: `❌ Error al enviar el beso.\n> ${error.message || 'Intenta de nuevo más tarde.'}`
      }, { quoted: m });
    }
  }
};