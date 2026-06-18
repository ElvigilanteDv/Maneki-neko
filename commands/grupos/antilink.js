module.exports = {
  command: ['antilink', 'antilinkoff', 'antilinkoff'],
  description: 'Activa o desactiva el antilink en el grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings    = ctx?.settings || {};
    const saveSettings = ctx?.saveSettings;
    const prefix      = ctx?.prefix || '.';

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const groupOptions = typeof settings.groupOptions === 'object' ? settings.groupOptions : {};
    const groupOpts    = typeof groupOptions[from] === 'object' ? groupOptions[from] : {};

    const subCmd = String(args[0] || '').toLowerCase();
    const current = Boolean(groupOpts.antilink);

    let newState;

    if (subCmd === 'on' || subCmd === '1' || subCmd === 'activar') {
      newState = true;
    } else if (subCmd === 'off' || subCmd === '0' || subCmd === 'desactivar') {
      newState = false;
    } else {
      newState = !current;
    }

    groupOptions[from] = { ...groupOpts, antilink: newState };
    saveSettings({ groupOptions });

    const estado = newState ? 'Activado' : 'Desactivado';

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Anti Link_
${BORDER_BOTTOM}

• Estado: *${estado}*

${newState ? '• Los enlaces serán eliminados' : '• Los enlaces serán permitidos'}
• Advertencias: 3 máximo
• Al llegar a 3 el usuario es expulsado`
    }, { quoted: m });
  },
};