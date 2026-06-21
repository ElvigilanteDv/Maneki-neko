module.exports = {
  command: ['antisticker', 'antistickers'],
  description: 'Activa o desactiva el borrado automático de stickers en el grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings     = ctx?.settings || {};
    const saveSettings = ctx?.saveSettings;
    const prefix       = ctx?.prefix || '.';

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const groupOptions = typeof settings.groupOptions === 'object' ? settings.groupOptions : {};
    const groupOpts    = typeof groupOptions[from] === 'object' ? groupOptions[from] : {};

    const subCmd  = String(args[0] || '').toLowerCase();
    const current = Boolean(groupOpts.antispamSticker);

    let newState;

    if (subCmd === 'on' || subCmd === '1' || subCmd === 'activar') {
      newState = true;
    } else if (subCmd === 'off' || subCmd === '0' || subCmd === 'desactivar') {
      newState = false;
    } else {
      newState = !current;
    }

    groupOptions[from] = { ...groupOpts, antispamSticker: newState };
    saveSettings({ groupOptions });

    const estado = newState ? 'Activado' : 'Desactivado';

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Anti Sticker_
${BORDER_BOTTOM}

• Estado: *${estado}*

${newState ? '• Los stickers serán eliminados' : '• Los stickers serán permitidos'}
• Admins y owner no son afectados

• Uso:
➜ ${prefix}antisticker — activar/desactivar
➜ ${prefix}antisticker on — activar
➜ ${prefix}antisticker off — desactivar`
    }, { quoted: m });
  },
};