const axios = require('axios');

module.exports = {
  command: ['ytvideo', 'ytv', 'video', 'videomp4'],
  description: 'Busca y descarga videos de YouTube',
  categoria: 'descargas',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const { prefix } = ctx;
    const query = args.join(' ');

    if (!query) {
      return client.sendMessage(from, {
        text: `YTVIDEO\n\nBusca y descarga videos de YouTube\n\nUso: ${prefix}ytvideo <nombre>\nEjemplo: ${prefix}ytvideo TWICE Strategy\nLuego usa el numero para descargar\n\n➮ Creador: Edward`
      }, { quoted: m });
    }

    const num = parseInt(query);
    if (!isNaN(num) && num > 0) {
      global.ytvideoSearchCache = global.ytvideoSearchCache || new Map();
      const cached = global.ytvideoSearchCache.get(from);

      if (cached && cached.results && cached.results.length >= num) {
        const selected = cached.results[num - 1];
        return downloadVideo(client, m, from, selected.url, selected.title);
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
      return downloadVideo(client, m, from, `https://www.youtube.com/watch?v=${videoId}`);
    }

    try {
      const searchRes = await axios.get(`https://api.delirius.store/search/ytsearch?q=${encodeURIComponent(query)}`);
      if (!searchRes.data.status || !searchRes.data.data.length) {
        return client.sendMessage(from, { text: 'No se encontraron resultados.' }, { quoted: m });
      }

      const results = searchRes.data.data.slice(0, 10);

      global.ytvideoSearchCache = global.ytvideoSearchCache || new Map();
      global.ytvideoSearchCache.set(from, { results, at: Date.now() });
      setTimeout(() => {
        const c = global.ytvideoSearchCache?.get(from);
        if (c && Date.now() - c.at >= 5 * 60 * 1000) global.ytvideoSearchCache.delete(from);
      }, 5 * 60 * 1000);

      let resultList = `RESULTADOS\n\nBusqueda: ${query}\n${results.length} resultados encontrados\n\n`;
      results.forEach((v, i) => {
        resultList += `${i + 1}. ${v.title}\n`;
        resultList += `   Autor: ${v.author?.name || 'Desconocido'} | Duracion: ${v.duration || '?'}\n`;
        resultList += `   ➮ Escribe ${i + 1} para descargar\n\n`;
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

async function downloadVideo(client, m, from, videoUrl, customTitle) {
  await client.sendMessage(from, { react: { text: '⏳', key: m.key } });

  try {
    const downloadRes = await axios.get(`https://api.delirius.store/download/ytmp4?url=${encodeURIComponent(videoUrl)}&format=360p`);

    if (!downloadRes.data.status) {
      throw new Error('No se pudo descargar el video');
    }

    const data = downloadRes.data.data;
    const title = customTitle || data.title || 'video';

    if (data.image) {
      await client.sendMessage(from, {
        image: { url: data.image },
        caption: `${title}\n\nAutor: ${data.author || 'Desconocido'}\nVistas: ${data.views || '?'}\nLikes: ${data.likes || '?'}\nFormato: ${data.format || '360p'}\n\nDescargando video...\n\n➮ Creador: Edward`
      }, { quoted: m });
    }

    await client.sendMessage(from, {
      video: { url: data.download },
      caption: `${title}\n\n➮ Creador: Edward`
    }, { quoted: m });

    await client.sendMessage(from, {
      text: `Descarga completada\n\n${title}\nFormato: ${data.format || '360p'}\n\n➮ Creador: Edward`
    }, { quoted: m });

    await client.sendMessage(from, { react: { text: '✅', key: m.key } });

  } catch (e) {
    await client.sendMessage(from, { react: { text: '❌', key: m.key } });
    client.sendMessage(from, { text: `Error al descargar: ${e.message}` }, { quoted: m });
  }
}