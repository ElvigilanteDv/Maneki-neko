module.exports = {
  command: ['play', 'ytaudio', 'musica'],
  description: 'Busca y descarga audio de YouTube',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings = ctx?.settings || {};
    const axios    = ctx?.axios;
    const apiBase  = String(settings.apiBaseUrl || '').trim();
    const apiKey   = String(settings.apiKey || '').trim();

    const firstArg = args[0];
    const isNumberChoice = /^([1-9]|10)$/.test(firstArg || '');

    if (isNumberChoice) {
      const index = parseInt(firstArg, 10) - 1;
      const cache = global.playSearchCache;
      const cached = cache?.get(from);

      if (!cached) {
        await client.sendMessage(from, { text: '❌ No hay una búsqueda activa.\n> Usa .play <nombre> primero' }, { quoted: m });
        return;
      }

      if (!cached.results[index]) {
        await client.sendMessage(from, { text: `❌ No existe el resultado #${firstArg}.` }, { quoted: m });
        return;
      }

      await descargarYEnviar(client, m, from, cached.results[index], apiBase, apiKey, axios);
      return;
    }

    const query = args.join(' ').trim();

    if (!query) {
      await client.sendMessage(from, { text: '❌ Escribe el nombre o link de la canción.\n> Ejemplo: .play imagine dragons believer' }, { quoted: m });
      return;
    }

    if (!apiBase || !apiKey) {
      await client.sendMessage(from, { text: '❌ La API no está configurada.' }, { quoted: m });
      return;
    }

    if (query.toLowerCase() === 'aleatorio' || query.toLowerCase() === 'random') {
      const cache = global.playSearchCache;
      const cached = cache?.get(from);

      if (!cached) {
        await client.sendMessage(from, { text: '❌ No hay una búsqueda activa.\n> Usa .play <nombre> primero' }, { quoted: m });
        return;
      }

      const randomIndex = Math.floor(Math.random() * cached.results.length);
      await descargarYEnviar(client, m, from, cached.results[randomIndex], apiBase, apiKey, axios);
      return;
    }

    let results = [];

    try {
      const { data } = await axios.get(`${apiBase}/api/search/youtube`, {
        params: { apiKey, query },
        timeout: 15000,
      });
      results = Array.isArray(data?.data) ? data.data.slice(0, 10) : [];
    } catch {
      await client.sendMessage(from, { text: '❌ Error al buscar en YouTube.' }, { quoted: m });
      return;
    }

    if (!results.length) {
      await client.sendMessage(from, { text: '❌ No se encontraron resultados.' }, { quoted: m });
      return;
    }

    global.playSearchCache = global.playSearchCache || new Map();
    global.playSearchCache.set(from, { results, at: Date.now() });
    setTimeout(() => {
      const c = global.playSearchCache?.get(from);
      if (c && Date.now() - c.at >= 5 * 60 * 1000) global.playSearchCache.delete(from);
    }, 5 * 60 * 1000);

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    let lista = '';
    results.forEach((r, i) => {
      lista += `⊹ ${i + 1}. ${r.title}\n> ${r.duration} ⊹ ${r.views}\n`;
    });

    const caption =
`${BORDER_TOP}
       ʀᴇꜱᴜʟᴛᴀᴅᴏꜱ
${BORDER_BOTTOM}

> Búsqueda: ${query}

『 ʀᴇꜱᴜʟᴛᴀᴅᴏꜱ 』

${lista}
⊹ Responde con: .play <número>
⊹ O escribe: .play aleatorio

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`;

    await client.sendMessage(from, { text: caption }, { quoted: m });
  },
};

async function descargarYEnviar(client, m, from, selected, apiBase, apiKey, axios) {
  await client.sendMessage(from, { text: `🐾 Descargando: ${selected.title}...` }, { quoted: m });

  try {
    const { data } = await axios.get(`${apiBase}/api/download/ytaudio`, {
      params: { url: selected.url, apiKey },
      timeout: 30000,
    });

    const downloadUrl = data?.result?.download_url;
    const title        = data?.result?.title || selected.title;

    if (!downloadUrl) {
      await client.sendMessage(from, { text: '❌ No se pudo obtener el audio.' }, { quoted: m });
      return;
    }

    await client.sendMessage(from, {
      audio: { url: downloadUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
    }, { quoted: m });
  } catch {
    await client.sendMessage(from, { text: '❌ Error al descargar el audio.' }, { quoted: m });
  }
}