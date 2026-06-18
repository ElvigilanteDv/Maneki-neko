module.exports = {
  command: ['promote', 'admin', 'daradmin', 'haceradmin'],
  description: 'Da el rango de administrador a un miembro',
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
       _Dar Admin_
${BORDER_BOTTOM}

• Uso correcto:
➜ .promote @usuario
➜ .promote (responder mensaje)

• El miembro recibirá permisos de administrador.`
      }, { quoted: m });
    }

    const results = [];
    for (const jid of targets) {
      try {
        await client.groupParticipantsUpdate(from, [jid], 'promote');
        results.push(`✓ @${jid.split('@')[0]} ahora es admin`);
      } catch {
        results.push(`✗ No pude dar admin a @${jid.split('@')[0]}`);
      }
    }

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Promote_
${BORDER_BOTTOM}

${results.join('\n')}`,
      mentions: targets,
    }, { quoted: m });
  },
};