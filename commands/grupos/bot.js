module.exports = {
  command: ['bot'],
  description: 'Activa o desactiva el bot en este grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings     = ctx?.settings || {};
    const saveSettings = ctx?.saveSettings;
    const prefix        = ctx?.prefix || '.';

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const groupOptions = typeof settings.groupOptions === 'object' ? settings.groupOptions : {};
    const groupOpts    = typeof groupOptions[from] === 'object' ? groupOptions[from] : {};

    const subCmd  = String(args[0] || '').toLowerCase();
    const current = Boolean(groupOpts.botOff);

    let newOffState;

    if (subCmd === 'on' || subCmd === 'activar' || subCmd === '1') {
      newOffState = false;
    } else if (subCmd === 'off' || subCmd === 'desactivar' || subCmd === '0') {
      newOffState = true;
    } else {
      newOffState = !current;
    }

    groupOptions[from] = { ...groupOpts, botOff: newOffState };
    saveSettings({ groupOptions });

    const estado = newOffState ? 'Desactivado' : 'Activado';

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Bot_
${BORDER_BOTTOM}

• Estado: *${estado}* en este grupo

${newOffState ? '• El bot no responderá comandos' : '• El bot responderá comandos'}
• Otros grupos no se ven afectados

• Uso:
➜ ${prefix}bot — activar/desactivar
➜ ${prefix}bot on — activar
➜ ${prefix}bot off — desactivar`
    }, { quoted: m });
  },
};