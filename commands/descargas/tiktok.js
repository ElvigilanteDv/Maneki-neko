module.exports = {
  command: ['tiktok', 'tt', 'tiktokdl'],
  description: 'Descarga video de TikTok o busca por palabra clave',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const { axios, settings } = ctx;
    const apiBase = settings.apiBaseUrl || '';
    const apiKey  = settings.apiKey || '';
    const prefix  = ctx.prefix || '.';

    const input = args.join(' ');

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    if (!input) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _TikTok Downloader Maneki_
${BORDER_BOTTOM}

• Uso correcto:
➜ .tiktok https://vm.tiktok.com/xxxxx
➜ .tiktok goku 
➜ 🐈 _*Maneki*_

• Descarga o busca videos de TikTok.`
      }, { quoted: m });
    }

    if (!apiBase || !apiKey) {
      return client.sendMessage(from, {
        text: '❌ La API de TikTok no está configurada.'
      }, { quoted: m });
    }

    try {
      const isUrl = input.includes('tiktok.com') || input.includes('vt.tiktok') || input.includes('vm.tiktok');

      if (isUrl) {
        await client.sendMessage(from, {
          text: `🐾 Descargando video...`
        }, { quoted: m });

        const downloadUrl = `${apiBase}/api/download/tiktok`;
        const { data } = await axios.get(downloadUrl, {
          params: {
            url: input,
            apiKey: apiKey
          },
          timeout: 30000
        });

        if (!data.status || !data.data || !data.data.media) {
          return client.sendMessage(from, {
            text: '🐈 No pude descargar el video.'
          }, { quoted: m });
        }

        const videoSinMarca = data.data.media.no_watermark;
        const stats = data.data.stats || {};
        const autor = data.data.author || {};

        const caption = 
`${BORDER_TOP}
       _TikTok Descargado Maneki 🐈_
${BORDER_BOTTOM}

📹 *${data.data.title || 'Sin título'}*

👤 *Autor:* ${autor.nickname || 'Desconocido'} (@${autor.username || ''})
❤️ Likes: ${stats.likes || 0}
👀 Vistas: ${stats.plays || 0}
💬 Comentarios: ${stats.comments || 0}
🔗 Compartidos: ${stats.shares || 0}`;

        await client.sendMessage(from, {
          video: { url: videoSinMarca },
          caption: caption
        }, { quoted: m });

      } else {
        await client.sendMessage(from, {
          text: `🐈 Buscando "${input}" en TikTok...`
        }, { quoted: m });

        const searchUrl = `${apiBase}/api/search/tiktok`;
        const { data: searchData } = await axios.get(searchUrl, {
          params: {
            apiKey: apiKey,
            query: input
          },
          timeout: 15000
        });

        if (!searchData.status || !searchData.data || searchData.data.length === 0) {
          return client.sendMessage(from, {
            text: `❌ No encontré videos para "${input}"`
          }, { quoted: m });
        }

        const firstVideo = searchData.data[0];
        const videoUrl = `https://www.tiktok.com/@${firstVideo.author.unique_id}/video/${firstVideo.video_id}`;

        const downloadUrl = `${apiBase}/api/download/tiktok`;
        const { data: downloadData } = await axios.get(downloadUrl, {
          params: {
            url: videoUrl,
            apiKey: apiKey
          },
          timeout: 30000
        });

        if (!downloadData.status || !downloadData.data || !downloadData.data.media) {
          return client.sendMessage(from, {
            text: '❌ No pude descargar el video.'
          }, { quoted: m });
        }

        const videoSinMarca = downloadData.data.media.no_watermark;
        const stats = downloadData.data.stats || {};
        const autor = downloadData.data.author || {};

        const caption = 
`${BORDER_TOP}
       _TikTok Encontrado Maneki 🐈_
${BORDER_BOTTOM}

📹 *${downloadData.data.title || 'Sin título'}*

👤 *Autor:* ${autor.nickname || 'Desconocido'} (@${autor.username || ''})
❤️ Likes: ${stats.likes || 0}
👀 Vistas: ${stats.plays || 0}
💬 Comentarios: ${stats.comments || 0}
🔗 Compartidos: ${stats.shares || 0}

🐾 *Búsqueda:* "${input}"`;

        await client.sendMessage(from, {
          video: { url: videoSinMarca },
          caption: caption
        }, { quoted: m });
      }

    } catch (error) {
      console.error('Error en tiktok:', error);
      let errorMsg = '❌ Ocurrió un error al procesar tu solicitud.';
      if (error.response) {
        errorMsg = `❌ Error de la API: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = '❌ No pude conectar con la API de TikTok.';
      }
      await client.sendMessage(from, {
        text: errorMsg
      }, { quoted: m });
    }
  }
};