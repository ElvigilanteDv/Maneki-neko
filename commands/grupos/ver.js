module.exports = {
  command: ['ver', 'view', 'vo'],
  description: 'Reenvía una imagen o video view once como mensaje normal',
  categoria: 'herramientas',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted || m.message;

    if (!target) {
      return client.sendMessage(from, {
        text: `${BORDER_TOP}
       _Ver View Once_
${BORDER_BOTTOM}

• Responde a una imagen o video "view once".

• El mensaje será reenviado como normal.`
      }, { quoted: m });
    }

    const isViewOnceImage = target.imageMessage?.viewOnce === true;
    const isViewOnceVideo = target.videoMessage?.viewOnce === true;

    if (!isViewOnceImage && !isViewOnceVideo) {
      return client.sendMessage(from, {
        text: '❌ El mensaje no es de "ver una sola vez".'
      }, { quoted: m });
    }

    try {
      const downloadMediaMessage = ctx?.downloadMediaMessage || client?.downloadMediaMessage;
      
      let buffer;
      if (typeof downloadMediaMessage === 'function') {
        buffer = await downloadMediaMessage(m, 'buffer', {});
      } else {
        const { downloadMediaMessage: dlMedia } = await import('@whiskeysockets/baileys');
        buffer = await dlMedia(m, 'buffer', {});
      }

      if (!buffer || !buffer.length) {
        throw new Error('No se pudo descargar el archivo.');
      }

      let type = 'image';
      let mimetype = 'image/jpeg';
      let caption = '';

      if (isViewOnceImage) {
        type = 'image';
        mimetype = target.imageMessage.mimetype || 'image/jpeg';
        caption = target.imageMessage.caption || '';
      } else if (isViewOnceVideo) {
        type = 'video';
        mimetype = target.videoMessage.mimetype || 'video/mp4';
        caption = target.videoMessage.caption || '';
      }

      const messageOptions = {
        [type]: buffer,
        caption: caption || 'View once reenviado',
        mimetype: mimetype
      };

      await client.sendMessage(from, messageOptions, { quoted: m });

      try {
        await client.sendMessage(from, { delete: m.key });
      } catch {}

    } catch (error) {
      console.error('Error en viewonce:', error);
      await client.sendMessage(from, {
        text: `❌ Error: ${error.message || 'No se pudo procesar el view once.'}`
      }, { quoted: m });
    }
  }
};