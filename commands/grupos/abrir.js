module.exports = {
  command: ['abrir', 'open', 'ogroup'],
  description: 'Abre el grupo (todos pueden enviar mensajes)',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      await client.groupSettingUpdate(from, 'not_announcement');

      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Grupo Abierto_
${BORDER_BOTTOM}

✅ El grupo ha sido _abierto_.
> Todos los miembros pueden enviar mensajes.

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    } catch (error) {
      await client.sendMessage(from, {
        text: '❌ Error al abrir el grupo.'
      }, { quoted: m });
    }
  }
};