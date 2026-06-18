module.exports = {
  command: ['bienvenida', 'despedida', 'welcome', 'goodbye'],
  description: 'Activa o desactiva bienvenida / despedida en el grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const settings  = ctx?.settings || {};
    const rawCmd    = String(
      m?.message?.conversation ||
      m?.message?.extendedTextMessage?.text || ''
    ).toLowerCase().split(/\s+/)[0].replace(/^\./, '');

    const isBienvenida = ['bienvenida', 'welcome'].includes(rawCmd);
    const isDespdida   = ['despedida', 'goodbye'].includes(rawCmd);
    const mode         = String(args[0] || '').toLowerCase();

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    if (!['on', 'off', '1', '0'].includes(mode)) {
      const tipo = isBienvenida ? 'BIENVENIDA' : 'DESPEDIDA';
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _${tipo}_
${BORDER_BOTTOM}

🐾 Uso correcto:

➜ .${rawCmd} on
➜ .${rawCmd} off

${BORDER_TOP}
       *🐾 ᴍᴀɴᴇᴋɪ ɴᴇᴋᴏ*
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    const all = settings.groupOptions && typeof settings.groupOptions === 'object'
      ? settings.groupOptions : {};
    const current = all[from] || {};
    const enabled = mode === 'on' || mode === '1';

    if (isBienvenida) {
      all[from] = { ...current, bienvenida: enabled };
    } else if (isDespdida) {
      all[from] = { ...current, despedida: enabled };
    }

    ctx.saveSettings({ groupOptions: all });

    if (isBienvenida) {
      await client.sendMessage(from, {
        text: enabled
          ? `${BORDER_TOP}
       _Bienvenida Activada_
${BORDER_BOTTOM}

✅ Estado: *ACTIVADO*

🖼️ Se enviará la imagen del grupo
📛 con el nombre de WhatsApp del nuevo miembro
cada vez que alguien entre.

${BORDER_TOP}
       *🐾 ᴍᴀɴᴇᴋɪ ɴᴇᴋᴏ*
${BORDER_BOTTOM}`
          : `${BORDER_TOP}
       _Bienvenida Desactivada_
${BORDER_BOTTOM}

❌ Estado: *DESACTIVADO*

🔇 Ya no se enviarán mensajes
de bienvenida en este grupo.

${BORDER_TOP}
       *🐾 ᴍᴀɴᴇᴋɪ ɴᴇᴋᴏ*
${BORDER_BOTTOM}`
      }, { quoted: m });
    } else {
      await client.sendMessage(from, {
        text: enabled
          ? `${BORDER_TOP}
       _Despedida Activada_
${BORDER_BOTTOM}

✅ Estado: *ACTIVADO*

🖼️ Se enviará la imagen del grupo
📛 con el nombre de WhatsApp del miembro
cada vez que alguien salga.

${BORDER_TOP}
       *🐾 ᴍᴀɴᴇᴋɪ ɴᴇᴋᴏ*
${BORDER_BOTTOM}`
          : `${BORDER_TOP}
       _Despedida Desactivada_
${BORDER_BOTTOM}

❌ Estado: *DESACTIVADO*

🔇 Ya no se enviarán mensajes
de despedida en este grupo.

${BORDER_TOP}
       *🐾 ᴍᴀɴᴇᴋɪ ɴᴇᴋᴏ*
${BORDER_BOTTOM}`
      }, { quoted: m });
    }
  },
};