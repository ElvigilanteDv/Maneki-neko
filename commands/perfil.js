module.exports = {
  command: ['perfil', 'profile', 'miperfil'],
  description: 'Muestra tu información de perfil registrada',
  categoria: 'sistema',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix = ctx?.prefix || '.';
    const axios  = ctx?.axios;
    const getUsers = ctx?.getUsers || (() => ({}));

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

✰ Usa ${prefix}register para registrarte.

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    const u = users[senderNum];

    let pfpBuffer = null;
    try {
      const ppUrl = await client.profilePictureUrl(`${senderNum}@s.whatsapp.net`, 'image');
      if (ppUrl && axios) {
        const resp = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
        pfpBuffer = Buffer.from(resp.data);
      }
    } catch {}

    const caption =
`${BORDER_TOP}
       ᴘᴇʀꜰɪʟ
${BORDER_BOTTOM}

✰ Usuario » @${senderNum}
❀ Nombre » ${u.nombre}
● Edad » ${u.edad} años
ꕥ Registrado » ${u.fecha}

${BORDER_TOP}
${BORDER_BOTTOM}`;

    if (pfpBuffer) {
      await client.sendMessage(from, {
        image: pfpBuffer,
        caption: caption,
        mentions: [sender]
      }, { quoted: m });
    } else {
      await client.sendMessage(from, {
        text: caption,
        mentions: [sender]
      }, { quoted: m });
    }
  },
};