module.exports = {
  command: ['play', 'ytaudio', 'musica'],
  description: 'Busca y descarga audio de YouTube',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings = ctx?.settings || {};
    const axios    = ctx?.axios;
    const apiBase  = String(settings.apiBaseUrl || '').trim();
    const apiKey   = String(settings.apiKey || '').trim();

    const query = args.join(' ').trim();

    if (!query) {
      await client.sendMessage(from, { text: '❌ Escribe el nombre o link de la canción.\n> Ejemplo: .play imagine dragons believer' }, { quoted: m });
      return;
    }

    if (!apiBase || !apiKey) {
      await client.sendMessage(from, { text: '❌ La API no está configurada.' }, { quoted: m });
      return;
    }

    let results = [];

    try {
      const { data } = await axios.get(`${apiBase}/api/search/youtube`, {
        params: { apiKey, query },
        timeout: 15000,
      });
      results = Array.isArray(data?.data) ? data.data.slice(0, 8) : [];
    } catch {
      await client.sendMessage(from, { text: '❌ Error al buscar en YouTube.' }, { quoted: m });
      return;
    }

    if (!results.length) {
      await client.sendMessage(from, { text: '❌ No se encontraron resultados.' }, { quoted: m });
      return;
    }

    global.playSearchCache = global.playSearchCache || new Map();
    const cacheKey = `${from}:${m.key.id}`;
    global.playSearchCache.set(cacheKey, results);
    setTimeout(() => global.playSearchCache.delete(cacheKey), 5 * 60 * 1000);

    const rows = results.map((r, i) => ({
      title: `${i + 1}. ${r.title}`.slice(0, 60),
      description: `${r.duration} ⊹ ${r.views}`.slice(0, 70),
      id: `playselect|${cacheKey}|${i}`,
    }));

    const listMessage = {
      text: '🐾 Maneki-Neko Bot\n\n> Elige una canción de la lista para descargarla',
      title: '𖣔 ʀᴇꜱᴜʟᴛᴀᴅᴏꜱ ᴅᴇ ʙúꜱQᴜᴇᴅᴀ ˚ʚ♡ɞ˚',
      footer: 'El Vigilante',
      interactiveButtons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: 'Ver resultados',
            sections: [
              {
                title: `Resultados para: ${query}`,
                rows,
              },
            ],
          }),
        },
      ],
    };

    await client.sendMessage(from, listMessage, { quoted: m });
  },

  before: async (client, m, ctx = {}) => {
    const id = String(m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? '' : '');

    let selectedId = '';
    const paramsJson = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (paramsJson) {
      try {
        const parsed = JSON.parse(paramsJson);
        selectedId = parsed?.id || '';
      } catch {}
    }
    if (!selectedId) {
      selectedId = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';
    }

    if (!selectedId.startsWith('playselect|')) return false;

    const [, cacheKey, indexStr] = selectedId.split('|');
    const index = parseInt(indexStr, 10);

    const cache = global.playSearchCache;
    const results = cache?.get(cacheKey);
    if (!results || !results[index]) {
      await client.sendMessage(m.key.remoteJid, { text: '❌ Esta búsqueda ya expiró, vuelve a usar .play' }, { quoted: m });
      return true;
    }

    const selected = results[index];
    const settings = ctx?.settings || {};
    const axios     = ctx?.axios;
    const apiBase   = String(settings.apiBaseUrl || '').trim();
    const apiKey    = String(settings.apiKey || '').trim();
    const from      = m.key.remoteJid;

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
        return true;
      }

      await client.sendMessage(from, {
        audio: { url: downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
      }, { quoted: m });
    } catch {
      await client.sendMessage(from, { text: '❌ Error al descargar el audio.' }, { quoted: m });
    }

    return true;
  },
};
              
