const { downloadMediaBuffer } = require('../../utils/mediaTools');

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
       _Ver View Once 🐾_
${BORDER_BOTTOM}

• Responde a una imagen o video "ver".

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

    // Obtener el mensaje de media correcto
    const mediaMessage = isViewOnceImage ? target.imageMessage : target.videoMessage;
    
    // Verificar que el mediaKey existe (el ViewOnce no ha expirado)
    if (!mediaMessage?.mediaKey) {
      return client.sendMessage(from, {
        text: '❌ Este view once ya expiró o fue visto. No se puede recuperar.'
      }, { quoted: m });
    }

    try {
      // Construir objeto mensaje compatible con downloadMediaBuffer
      const fakeMsg = {
        key: m.key,
        message: isViewOnceImage 
          ? { imageMessage: mediaMessage }
          : { videoMessage: mediaMessage }
      };

      const buffer = await downloadMediaBuffer(ctx, client, fakeMsg);

      if (!buffer || !buffer.length) {
        throw new Error('No se pudo descargar el archivo.');
      }

      let type = 'image';
      let mimetype = 'image/jpeg';
      let caption = '';

      if (isViewOnceImage) {
        type = 'image';
        mimetype = mediaMessage.mimetype || 'image/jpeg';
        caption = mediaMessage.caption || '';
      } else if (isViewOnceVideo) {
        type = 'video';
        mimetype = mediaMessage.mimetype || 'video/mp4';
        caption = mediaMessage.caption || '';
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
