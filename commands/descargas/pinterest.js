module.exports = {
  command: ['pinterest', 'pin', 'pins'],
  description: 'Busca imágenes en Pinterest por palabra clave',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const { axios, settings } = ctx;
    const apiBase = settings.apiBaseUrl || '';
    const apiKey = settings.apiKey || '';
    const prefix = ctx.prefix || '.';

    const query = args.join(' ');
    if (!query) {
      await client.sendMessage(from, {
        text: `❌ Debes escribir lo que quieres buscar.\n> Ejemplo: ${prefix}pinterest gatos`
      }, { quoted: m });
      return;
    }

    if (!apiBase || !apiKey) {
      await client.sendMessage(from, {
        text: '❌ La API de Pinterest no está configurada.'
      }, { quoted: m });
      return;
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      const searchUrl = `${apiBase}/api/search/pinterest`;
      const { data } = await axios.get(searchUrl, {
        params: { apiKey, query },
        timeout: 15000
      });

      if (!data.status || !data.data || data.data.length === 0) {
        await client.sendMessage(from, {
          text: `❌ No encontré imágenes para "${query}"`
        }, { quoted: m });
        return;
      }

      const validPins = data.data.filter(pin => pin.image_url && pin.image_url !== null);
      if (validPins.length === 0) {
        await client.sendMessage(from, {
          text: `❌ No encontré imágenes válidas para "${query}"`
        }, { quoted: m });
        return;
      }

      const pin = validPins[0];
      const imageUrl = pin.image_url;
      const title = pin.grid_title || 'Sin título';
      const desc = pin.description || 'Sin descripción';
      const autor = pin.pinner?.full_name || 'Desconocido';
      const username = pin.pinner?.username ? `@${pin.pinner.username}` : '';
      const followers = pin.pinner?.follower_count || 0;

      const caption = `${BORDER_TOP}
       ᴘɪɴᴛᴇʀᴇꜱᴛ ɪᴍᴀɢᴇɴ
${BORDER_BOTTOM}

⊹ Título: ${title}
⊹ Descripción: ${desc}
⊹ Autor: ${autor} ${username}
⊹ Seguidores: ${followers}
⊹ Búsqueda: "${query}"

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`;

      await client.sendMessage(from, {
        image: { url: imageUrl },
        caption: caption
      }, { quoted: m });

    } catch (error) {
      console.error('Error en Pinterest:', error);
      await client.sendMessage(from, {
        text: '❌ Ocurrió un error al buscar en Pinterest.'
      }, { quoted: m });
    }
  }
};