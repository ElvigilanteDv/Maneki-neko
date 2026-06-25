module.exports = {
  command: ['unregister', 'unreg', 'borrarregistro'],
  description: 'Elimina tu registro del bot',
  categoria: 'sistema',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix = ctx?.prefix || '.';
    const getUsers = ctx?.getUsers || (() => ({}));
    const saveUsers = ctx?.saveUsers || (() => {});

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const sender = m.key.participant || m.key.remoteJid;
    const senderNum = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');

    const users = getUsers();

    if (!users[senderNum]) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ɴᴏ ᴇꜱᴛᴀꜱ ʀᴇɢɪꜱᴛʀᴀᴅᴏ
${BORDER_BOTTOM}

❀ No tienes un registro activo.

> Usa ${prefix}register para registrarte.

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    const u = users[senderNum];

    const confirmacion = args[0]?.toLowerCase();

    if (confirmacion !== 'confirmar' && confirmacion !== 'si') {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ᴄᴏɴꜰɪʀᴍᴀʀ ᴇʟɪᴍɪɴᴀᴄɪóɴ
${BORDER_BOTTOM}

❀ ¿Seguro que quieres eliminar tu registro?

● Usuario » @${senderNum}
❀ Nombre » ${u.nombre}
◆ Edad » ${u.edad} años

✰ Para confirmar escribe:
> ${prefix}unregister confirmar

✰ Esta acción no se puede deshacer.

${BORDER_TOP}
${BORDER_BOTTOM}`,
        mentions: [sender]
      }, { quoted: m });
    }

    delete users[senderNum];
    saveUsers(users);

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       ʀᴇɢɪꜱᴛʀᴏ ᴇʟɪᴍɪɴᴀᴅᴏ
${BORDER_BOTTOM}

❀ Tu registro ha sido eliminado.

● Usuario » @${senderNum}
❀ Nombre » ${u.nombre}

✰ Ya no podrás usar los comandos del bot.
✰ Si quieres volver a usarlo, usa ${prefix}register.

${BORDER_TOP}
${BORDER_BOTTOM}`,
      mentions: [sender]
    }, { quoted: m });
  },
};