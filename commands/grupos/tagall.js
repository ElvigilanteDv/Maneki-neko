module.exports = {
  command: ['tagall', 'todos', 'everyone'],
  description: 'Menciona a todos los miembros del grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const mensaje = args.join(' ') || 'Mensaje del admin';

    try {
      const groupMetadata = await client.groupMetadata(from);
      const participants = groupMetadata.participants;

      if (!participants || participants.length === 0) {
        return client.sendMessage(from, {
          text: '❌ No hay miembros en el grupo.'
        }, { quoted: m });
      }

      const mentions = participants.map(p => p.id);
      const tagText = participants.map(p => `@${p.id.split('@')[0]}`).join(' ');

      const caption = `${BORDER_TOP}
       _Tag All_
${BORDER_BOTTOM}

${mensaje}

${tagText}`;

      await client.sendMessage(from, {
        text: caption,
        mentions: mentions
      }, { quoted: m });

    } catch (error) {
      console.error('Error en tagall:', error);
      await client.sendMessage(from, {
        text: `❌ Error: ${error.message || 'No se pudo etiquetar a todos.'}`
      }, { quoted: m });
    }
  }
};