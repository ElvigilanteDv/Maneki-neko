module.exports = {
  // Palabras que activan este comando
  command: ['tiktok', 'tt'],
  description: 'Busca y descarga el primer video de TikTok con la palabra clave',
  categoria: 'descargas',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    // --------------------------------------------
    // 1. Sacamos herramientas del contexto (ctx)
    // --------------------------------------------
    const { axios, settings } = ctx;
    // settings es un objeto que tiene tu apiKey y apiBaseUrl
    const apiBase = settings.apiBaseUrl || '';  // Ej: "https://tu-api.com"
    const apiKey  = settings.apiKey || '';      // "elvigilante"
    const prefix  = ctx.prefix || '.';          // El prefijo que usa el bot

    // --------------------------------------------
    // 2. Validamos que el usuario haya escrito algo
    // --------------------------------------------
    // args es un arreglo, unimos todo en un solo string
    const query = args.join(' ');
    if (!query) {
      await client.sendMessage(from, {
        text: `❌ Debes escribir lo que quieres buscar.\n> Ejemplo: ${prefix}tiktok goku`
      }, { quoted: m });
      return;
    }

    // --------------------------------------------
    // 3. Verificamos que la API esté configurada
    // --------------------------------------------
    if (!apiBase || !apiKey) {
      await client.sendMessage(from, {
        text: '❌ La API de TikTok no está configurada en los ajustes.'
      }, { quoted: m });
      return;
    }

    // --------------------------------------------
    // 4. Hacemos la búsqueda
    // --------------------------------------------
    try {
      // Mostramos un mensaje de "buscando..."
      await client.sendMessage(from, {
        text: `🔍 Buscando "${query}" en TikTok...`
      }, { quoted: m });

      // Llamada a la API de búsqueda
      const searchUrl = `${apiBase}/api/search/tiktok`;
      const { data: searchData } = await axios.get(searchUrl, {
        params: {
          apiKey: apiKey,
          query: query
        },
        timeout: 15000 // 15 segundos máximo
      });

      // Verificamos que la respuesta sea exitosa y tenga datos
      if (!searchData.status || !searchData.data || searchData.data.length === 0) {
        await client.sendMessage(from, {
          text: `❌ No encontré videos para "${query}"`
        }, { quoted: m });
        return;
      }

      // --------------------------------------------
      // 5. Tomamos el primer video de los resultados
      // --------------------------------------------
      const firstVideo = searchData.data[0];
      // firstVideo tiene: video_id, title, play_count, digg_count, etc.
      // También tiene la URL del video sin watermark? No, la búsqueda solo da
      // la URL con watermark (wmplay) o play. Pero para descargar sin marca,
      // usamos el endpoint de descarga con la URL del video.

      // Construimos la URL del video (la que se ve en TikTok)
      // En los datos de búsqueda no viene la URL directa del perfil,
      // pero podemos armar algo como: https://www.tiktok.com/@user/video/xxxx
      // Sin embargo, es más seguro usar el endpoint de descarga con la URL
      // del video desde el objeto. Pero en los datos de búsqueda no viene
      // la URL pública. Normalmente se usa el video_id para construirla:
      // `https://www.tiktok.com/@${author.unique_id}/video/${video_id}`
      const videoUrl = `https://www.tiktok.com/@${firstVideo.author.unique_id}/video/${firstVideo.video_id}`;

      // --------------------------------------------
      // 6. Descargamos el video sin watermark
      // --------------------------------------------
      const downloadUrl = `${apiBase}/api/download/tiktok`;
      const { data: downloadData } = await axios.get(downloadUrl, {
        params: {
          url: videoUrl,
          apiKey: apiKey
        },
        timeout: 30000 // 30 segundos para descargar
      });

      if (!downloadData.status || !downloadData.data || !downloadData.data.media) {
        await client.sendMessage(from, {
          text: '❌ No pude descargar el video.'
        }, { quoted: m });
        return;
      }

      // El video sin watermark está en: downloadData.data.media.no_watermark
      const videoSinMarca = downloadData.data.media.no_watermark;

      // --------------------------------------------
      // 7. Construimos el mensaje con información del video
      // --------------------------------------------
      const stats = downloadData.data.stats || {};
      const autor = downloadData.data.author || {};
      const caption = `
📹 *${downloadData.data.title || 'Sin título'}*

👤 *Autor:* ${autor.nickname || 'Desconocido'} (@${autor.username || ''})
❤️ Likes: ${stats.likes || 0}
👀 Vistas: ${stats.plays || 0}
💬 Comentarios: ${stats.comments || 0}
🔗 Compartidos: ${stats.shares || 0}

🔍 *Búsqueda:* "${query}"
      `.trim();

      // --------------------------------------------
      // 8. Enviamos el video como documento o como video
      // --------------------------------------------
      // Lo enviamos como video (si el cliente lo soporta) o como documento
      // para evitar compresión excesiva.
      await client.sendMessage(from, {
        video: { url: videoSinMarca },
        caption: caption,
        // Si quieres que se vea como un video reproducible en WhatsApp:
        // mimetype: 'video/mp4'
      }, { quoted: m });

    } catch (error) {
      // --------------------------------------------
      // 9. Manejo de errores
      // --------------------------------------------
      console.error('Error en comando tiktok:', error);
      let errorMsg = '❌ Ocurrió un error al procesar tu solicitud.';
      if (error.response) {
        // La API respondió con un error (ej: 404, 500)
        errorMsg = `❌ Error de la API: ${error.response.status} - ${error.response.statusText}`;
      } else if (error.request) {
        // No hubo respuesta de la API (timeout, red caída)
        errorMsg = '❌ No pude conectar con la API de TikTok. Intenta de nuevo.';
      }
      await client.sendMessage(from, {
        text: errorMsg
      }, { quoted: m });
    }
  }
};