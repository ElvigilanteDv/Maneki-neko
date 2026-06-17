module.exports = {
  command: ['ping', 'velocidad', 'internet', 'conexion'],
  description: 'Muestra la velocidad de respuesta del bot',
  categoria: 'sistema',

  run: async (client, m, args, from) => {
    const start = Date.now();

    const up = Math.floor(process.uptime());
    const h  = Math.floor(up / 3600);
    const mm = Math.floor((up % 3600) / 60);
    const ss = up % 60;
    const uptime =
      String(h).padStart(2,'0') + ':' +
      String(mm).padStart(2,'0') + ':' +
      String(ss).padStart(2,'0');

    const mem = process.memoryUsage();
    const ramUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const sent = await client.sendMessage(
      from,
      { text: `${BORDER_TOP}\n       ᴄᴀʟᴄᴜʟᴀɴᴅᴏ...\n${BORDER_BOTTOM}` },
      { quoted: m }
    );

    const latency = Date.now() - start;

    const caption =
`${BORDER_TOP}
       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ
${BORDER_BOTTOM}

『 ᴘɪɴɢ 』

⊹ Latencia: ${latency}ms
> Tiempo de respuesta del bot
⊹ Uptime: ${uptime}
> Tiempo que el bot lleva encendido
⊹ RAM: ${ramUsed} MB
> Memoria utilizada actualmente

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`;

    await client.sendMessage(
      from,
      { text: caption, edit: sent.key },
      { quoted: m }
    ).catch(async () => {
      await client.sendMessage(from, { text: caption }, { quoted: m });
    });
  },
};
              
