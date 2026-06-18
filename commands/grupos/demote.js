module.exports = {
  command: ['demote', 'desadmin', 'removeadmin', 'quitaradmin'],
  description: 'Quita el rango de administrador a un miembro',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const mentioned = m?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted    = m?.message?.extendedTextMessage?.contextInfo?.participant;
    const targets   = mentioned.length > 0 ? mentioned : (quoted ? [quoted] : []);

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    if (!targets.length) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Quitar Admin_
${BORDER_BOTTOM}

• Uso correcto:
➜ .demote @usuario
➜ .demote (responder mensaje)

• El miembro perderá sus permisos de administrador.`
      }, { quoted: m });
    }

    const results = [];
    for (const jid of targets) {
      try {
        await client.groupParticipantsUpdate(from, [jid], 'demote');
        results.push(`✓ @${jid.split('@')[0]} ya no es admin`);
      } catch {
        results.push(`✗ No pude quitar admin a @${jid.split('@')[0]}`);
      }
    }

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Demote_
${BORDER_BOTTOM}

${results.join('\n')}`,
      mentions: targets,
    }, { quoted: m });
  },
};