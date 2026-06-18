module.exports = {
  command: ['kick', 'expulsar', 'ban', 'sacar'],
  description: 'Expulsa a un miembro del grupo',
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
       _Expulsar Miembro_
${BORDER_BOTTOM}

• Uso correcto:
➜ .kick @usuario
➜ .kick (responder mensaje)

• El miembro será expulsado del grupo.`
      }, { quoted: m });
    }

    const results = [];
    for (const jid of targets) {
      try {
        await client.groupParticipantsUpdate(from, [jid], 'remove');
        results.push(`✓ @${jid.split('@')[0]} fue expulsado`);
      } catch {
        results.push(`✗ No pude expulsar a @${jid.split('@')[0]}`);
      }
    }

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Kick_
${BORDER_BOTTOM}

${results.join('\n')}`,
      mentions: targets,
    }, { quoted: m });
  },
};