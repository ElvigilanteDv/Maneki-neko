module.exports = {
  command: ['ppt', 'foto', 'pfp'],
  description: 'Obtiene la foto de perfil de un usuario',
  categoria: 'general',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix = ctx?.prefix || '.';

    let targetJid =
      m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      m.message?.extendedTextMessage?.contextInfo?.participant ||
      null;

    if (!targetJid) {
      const mentionArg = args.find(a => a.startsWith('@'));
      if (mentionArg) {
        const num = mentionArg.replace('@', '').replace(/\D/g, '');
        if (num) targetJid = `${num}@s.whatsapp.net`;
      }
    }

    if (!targetJid) {
      await client.sendMessage(from, {
        text: `❌ Menciona a alguien o responde su mensaje.\n> Ejemplo: ${prefix}ppt @usuario`
      }, { quoted: m });
      return;
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    let ppUrl = null;

    try {
      ppUrl = await client.profilePictureUrl(targetJid, 'image');
    } catch {
      try {
        ppUrl = await client.profilePictureUrl(targetJid, 'preview');
      } catch {
        ppUrl = null;
      }
    }

    if (!ppUrl) {
      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ꜰᴏᴛᴏ ᴅᴇ ᴘᴇʀꜰɪʟ
${BORDER_BOTTOM}

⊹ @${targetJid.split('@')[0]}
> No tiene foto de perfil o la tiene privada

${BORDER_TOP}
${BORDER_BOTTOM}`,
        mentions: [targetJid],
      }, { quoted: m });
      return;
    }

    const caption =
`${BORDER_TOP}
       ꜰᴏᴛᴏ ᴅᴇ ᴘᴇʀꜰɪʟ
${BORDER_BOTTOM}

⊹ @${targetJid.split('@')[0]}

${BORDER_TOP}
${BORDER_BOTTOM}`;

    try {
      await client.sendMessage(from, {
        image: { url: ppUrl },
        caption,
        mentions: [targetJid],
      }, { quoted: m });
    } catch {
      await client.sendMessage(from, {
        text: '❌ Error al obtener la foto de perfil.'
      }, { quoted: m });
    }
  },
};
