const axios = require('axios');
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
} = require('@whiskeysockets/baileys');

module.exports = {
  command: ['play', 'yt', 'audio', 'musica', 'song'],
  description: 'Busca y descarga musica de YouTube',
  categoria: 'descargas',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const { prefix } = ctx;
    const query = args.join(' ');

    if (!query) {
      let media = null;
      try {
        media = await prepareWAMessageMedia(
          { image: { url: 'https://files.catbox.moe/8r6m4c.jpg' } },
          { upload: client.waUploadToServer }
        );
      } catch {}

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: {
          title: 'MANEKI-NEKO',
          subtitle: 'Descarga musica de YouTube',
          hasMediaAttachment: !!media,
          imageMessage: media?.imageMessage
        },
        body: {
          text: `PLAY YOUTUBE\n\nBusca y descarga musica de YouTube\n\nUso: ${prefix}play <nombre o link>\nEjemplo: ${prefix}play TWICE Strategy\n\nPowered by El Vigilante API`
        },
        footer: {
          text: 'Maneki-Neko Bot'
        },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: 'YOUTUBE',
              sections: [{
                title: 'Que deseas hacer',
                rows: [{
                  header: 'BUSCAR',
                  title: 'Buscar musica',
                  description: 'Escribe el nombre despues del comando',
                  id: 'ytsearch'
                }]
              }]
            })
          }]
        }
      });

      const msg = generateWAMessageFromContent(
        from,
        { viewOnceMessage: { message: { messageContextInfo: {}, interactiveMessage } } },
        { quoted: m }
      );
      return client.relayMessage(from, msg.message, { messageId: msg.key.id });
    }

    await client.sendMessage(from, { react: { text: '🔍', key: m.key } });

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([^\s&]+)/i;
    const match = query.match(youtubeRegex);

    if (match) {
      const videoId = match[1];
      return downloadAudio(client, m, from, `https://www.youtube.com/watch?v=${videoId}`);
    }

    try {
      const searchRes = await axios.get(`https://api.delirius.store/search/ytsearch?q=${encodeURIComponent(query)}`);
      if (!searchRes.data.status || !searchRes.data.data.length) {
        return client.sendMessage(from, { text: 'No se encontraron resultados.' }, { quoted: m });
      }

      const results = searchRes.data.data.slice(0, 10);
      let media = null;
      try {
        media = await prepareWAMessageMedia(
          { image: { url: results[0].image || results[0].thumbnail } },
          { upload: client.waUploadToServer }
        );
      } catch {}

      const rows = results.map((v, i) => ({
        header: String(v.author?.name || 'Desconocido').slice(0, 20),
        title: String(v.title || '').slice(0, 35),
        description: `Duracion: ${v.duration || '?'} | Vistas: ${formatViews(v.views)}`,
        id: `ytplay~${Buffer.from(v.url).toString('base64')}~${Buffer.from(String(v.title || 'audio')).toString('base64')}`
      }));

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        header: {
          title: 'RESULTADOS',
          subtitle: query.slice(0, 30),
          hasMediaAttachment: !!media,
          imageMessage: media?.imageMessage
        },
        body: {
          text: `RESULTADOS\n\nBusqueda: ${query}\n${results.length} resultados encontrados\n\nSelecciona el video que quieras descargar`
        },
        footer: {
          text: 'Maneki-Neko Bot'
        },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: 'RESULTADOS',
              sections: [{
                title: query.toUpperCase().slice(0, 24),
                rows
              }]
            })
          }]
        }
      });

      const msg = generateWAMessageFromContent(
        from,
        { viewOnceMessage: { message: { messageContextInfo: {}, interactiveMessage } } },
        { quoted: m }
      );
      await client.relayMessage(from, msg.message, { messageId: msg.key.id });
      await client.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
      await client.sendMessage(from, { react: { text: '❌', key: m.key } });
      client.sendMessage(from, { text: `Error: ${e.message}` }, { quoted: m });
    }
  },

  before: async (client, m, from) => {
    const nativeFlow = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage;
    if (!nativeFlow) return false;

    let id;
    try {
      const data = JSON.parse(nativeFlow.paramsJson || '{}');
      id = data.id || data.selectedId || data.selectedRowId || null;
    } catch { return false; }

    if (!id) return false;

    if (id === 'ytsearch') {
      await client.sendMessage(from, {
        text: 'Escribe el nombre de la cancion:\n> .play <nombre>'
      }, { quoted: m });
      return true;
    }

    if (id.startsWith('ytplay~')) {
      const parts = id.split('~');
      if (parts.length < 3) return true;
      const urlB64 = parts[1];
      const titleB64 = parts[2];
      let videoUrl, title;
      try {
        videoUrl = Buffer.from(urlB64, 'base64').toString();
        title = Buffer.from(titleB64, 'base64').toString();
      } catch { return true; }

      await downloadAudio(client, m, from, videoUrl, title);
      return true;
    }

    return false;
  }
};

async function downloadAudio(client, m, from, videoUrl, customTitle) {
  await client.sendMessage(from, { react: { text: '⏳', key: m.key } });

  try {
    const downloadRes = await axios.get(`https://api.delirius.store/download/ytmp3?url=${encodeURIComponent(videoUrl)}`);

    if (!downloadRes.data.status) {
      throw new Error('No se pudo descargar el audio');
    }

    const data = downloadRes.data.data;
    const title = customTitle || data.title || 'audio';

    if (data.image) {
      await client.sendMessage(from, {
        image: { url: data.image },
        caption: `${title}\n\nAutor: ${data.author || 'Desconocido'}\nVistas: ${data.views || '?'}\nLikes: ${data.likes || '?'}\nFormato: ${data.format || 'mp3'}\n\nDescargando audio...`
      }, { quoted: m });
    }

    await client.sendMessage(from, {
      audio: { url: data.download },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: m });

    await client.sendMessage(from, {
      text: `Descarga completada\n\n${title}\nFormato: ${data.format || 'mp3'}\n\nPowered by Maneki-Neko Bot`
    }, { quoted: m });

    await client.sendMessage(from, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await client.sendMessage(from, { react: { text: '❌', key: m.key } });
    client.sendMessage(from, { text: `Error al descargar: ${e.message}` }, { quoted: m });
  }
}

function formatViews(num) {
  if (!num) return '?';
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}