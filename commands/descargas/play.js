const axios = require('axios');

module.exports = {
  command: ['play', 'yt', 'audio', 'musica', 'song'],
  description: 'Busca y descarga musica de YouTube',
  categoria: 'descargas',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const { prefix } = ctx;
    const query = args.join(' ');

    if (!query) {
      return client.sendMessage(from, {
        text: `PLAY YOUTUBE\n\nBusca y descarga musica de YouTube\n\nUso: ${prefix}play <nombre>\nEjemplo: ${prefix}play TWICE Strategy\nLuego usa ${prefix}play <numero> para descargar\n\n➮ Creador: Edward`
      }, { quoted: m });
    }

    const num = parseInt(query);
    if (!isNaN(num) && num > 0) {
      const cacheKey = `ytsearch_${from}`;
      if (!global.ytCache) global.ytCache = new Map();
      const cached = global.ytCache.get(cacheKey);
      
      if (cached && cached.length >= num) {
        const selected = cached[num - 1];
        return downloadAudio(client, m, from, selected.url, selected.title);
      } else {
        return client.sendMessage(from, { 
          text: `No hay resultado #${num} en la cache. Realiza una nueva busqueda primero.` 
        }, { quoted: m });
      }
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
      
      if (!global.ytCache) global.ytCache = new Map();
      global.ytCache.set(`ytsearch_${from}`, results);
      setTimeout(() => global.ytCache.delete(`ytsearch_${from}`), 60000);

      let resultList = `RESULTADOS\n\nBusqueda: ${query}\n${results.length} resultados encontrados\n\n`;
      results.forEach((v, i) => {
        resultList += `${i + 1}. ${v.title}\n`;
        resultList += `   Autor: ${v.author?.name || 'Desconocido'} | Duracion: ${v.duration || '?'}\n`;
        resultList += `   ➮ Usa ${prefix}play ${i + 1} para descargar\n\n`;
      });
      resultList += `➮ Creador: Edward`;

      if (results[0].image || results[0].thumbnail) {
        await client.sendMessage(from, {
          image: { url: results[0].image || results[0].thumbnail },
          caption: resultList
        }, { quoted: m });
      } else {
        await client.sendMessage(from, {
          text: resultList
        }, { quoted: m });
      }

      await client.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
      await client.sendMessage(from, { react: { text: '❌', key: m.key } });
      client.sendMessage(from, { text: `Error: ${e.message}` }, { quoted: m });
    }
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
        caption: `${title}\n\nAutor: ${data.author || 'Desconocido'}\nVistas: ${data.views || '?'}\nLikes: ${data.likes || '?'}\nFormato: ${data.format || 'mp3'}\n\nDescargando audio...\n\n➮ Creador: Edward`
      }, { quoted: m });
    }

    await client.sendMessage(from, {
      audio: { url: data.download },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`
    }, { quoted: m });

    await client.sendMessage(from, {
      text: `Descarga completada\n\n${title}\nFormato: ${data.format || 'mp3'}\n\n➮ Creador: Edward`
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