module.exports = {
  command: ['report', 'reportar'],
  description: 'Reporta un chat o usuario (solo owner)',
  categoria: 'sistema',
  isOwner: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const target = args[0] || m.key.remoteJid;

    if (!target) {
      return client.sendMessage(from, {
        text: `➜ Uso: .report @usuario\n➜ Responde a un mensaje con .report`
      }, { quoted: m });
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      // Método de reporte de Baileys
      await client.reportChat(target);

      await client.sendMessage(from, {
        text: `${BORDER_TOP}
       _Reporte Enviado_
${BORDER_BOTTOM}

✓ Reporte enviado a WhatsApp
➜ Usuario: ${target}

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });

    } catch (error) {
      await client.sendMessage(from, {
        text: `✗ Error al reportar: ${error.message}`
      }, { quoted: m });
    }
  }
};