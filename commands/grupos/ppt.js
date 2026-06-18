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

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    if (!targetJid) {
      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Foto de Perfil_
${BORDER_BOTTOM}

• Uso correcto:
➜ ${prefix}ppt @usuario
➜ ${prefix}ppt (responder mensaje)

• Obtiene la foto de perfil del usuario.`
      }, { quoted: m });
      return;
    }

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
       _Foto de Perfil_
${BORDER_BOTTOM}

• @${targetJid.split('@')[0]}
> No tiene foto de perfil o la tiene privada`,
        mentions: [targetJid],
      }, { quoted: m });
      return;
    }

    const caption =
`${BORDER_TOP}
       _Foto de Perfil_
${BORDER_BOTTOM}

• @${targetJid.split('@')[0]}`;

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