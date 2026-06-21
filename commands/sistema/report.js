module.exports = {
  command: ['report', 'reportar'],
  description: 'Reporta un chat o usuario (solo owner)',
  categoria: 'sistema',
  isOwner: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    let target = args[0] || null;

    if (target) {
      const cleanNum = target.replace(/\D/g, '');
      if (cleanNum) {
        target = `${cleanNum}@s.whatsapp.net`;
      }
    }

    if (!target) {
      const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
      if (quoted) {
        target = quoted;
      } else {
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length > 0) {
          target = mentioned[0];
        }
      }
    }

    if (!target) {
      return client.sendMessage(from, {
        text: `➜ Uso: .report @usuario\n➜ .report 59177474230\n➜ Responde a un mensaje con .report`
      }, { quoted: m });
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      if (typeof client.reportSpam === 'function') {
        await client.reportSpam(target);
      } else if (typeof client.sendReport === 'function') {
        await client.sendReport(target);
      } else if (typeof client.report === 'function') {
        await client.report(target);
      } else {
        await client.sendMessage(target, {
          text: 'report',
          report: true
        });
      }

      await client.sendMessage(from, {
        text: `${BORDER_TOP}
       _Reporte Enviado_
${BORDER_BOTTOM}

✓ Reporte enviado a WhatsApp
➜ Usuario: ${target.split('@')[0]}

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