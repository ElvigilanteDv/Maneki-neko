module.exports = {
  command: ['cerrar', 'close', 'cgroup'],
  description: 'Cierra el grupo (solo admins pueden enviar mensajes)',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      await client.groupSettingUpdate(from, 'announcement');

      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Grupo Cerrado_
${BORDER_BOTTOM}

🔒 El grupo ha sido _cerrado_.
> Solo administradores pueden enviar mensajes.

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    } catch (error) {
      await client.sendMessage(from, {
        text: '❌ Error al cerrar el grupo.'
      }, { quoted: m });
    }
  }
};