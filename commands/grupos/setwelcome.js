module.exports = {
  command: ['setwelcome', 'bienvenida'],
  description: 'Personaliza el mensaje de bienvenida del grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const settings     = ctx?.settings || {};
    const saveSettings = ctx?.saveSettings;
    const prefix       = ctx?.prefix || '.';
    const downloadMediaMessage = ctx?.downloadMediaMessage;

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const groupOptions = typeof settings.groupOptions === 'object' ? settings.groupOptions : {};
    const groupOpts    = typeof groupOptions[from] === 'object' ? groupOptions[from] : {};

    const subCmd = String(args[0] || '').toLowerCase();

    if (subCmd === 'off' || subCmd === 'desactivar') {
      groupOptions[from] = { ...groupOpts, bienvenida: false };
      saveSettings({ groupOptions });
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

➜ ❌ Bienvenida desactivada
➜ El bot ya no enviará mensajes al entrar nuevos miembros

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    if (subCmd === 'on' || subCmd === 'activar') {
      groupOptions[from] = { ...groupOpts, bienvenida: true };
      saveSettings({ groupOptions });
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

➜ ✅ Bienvenida activada
➜ Se usará el mensaje ${groupOpts.welcomeText ? 'personalizado' : 'por defecto'}

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    if (subCmd === 'reset') {
      groupOptions[from] = { ...groupOpts, welcomeText: null, welcomeImage: null };
      saveSettings({ groupOptions });
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

➜ ✅ Mensaje e imagen restablecidos al default

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    if (subCmd === 'ver' || subCmd === 'show') {
      const estado  = groupOpts.bienvenida ? '✅ Activa' : '❌ Inactiva';
      const texto   = groupOpts.welcomeText || '(mensaje por defecto)';
      const imagen  = groupOpts.welcomeImage ? '✅ Imagen personalizada guardada' : '(imagen del grupo o ninguna)';

      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

【 ᴄᴏɴꜰɪɢᴜʀᴀᴄɪóɴ ᴀᴄᴛᴜᴀʟ 】

➜ Estado: ${estado}
➜ Imagen: ${imagen}

➜ Texto:
> ${texto.replace(/\n/g, '\n> ')}

【 ᴠᴀʀɪᴀʙʟᴇꜱ ᴅɪꜱᴘᴏɴɪʙʟᴇꜱ 】

➜ {nombre} — nombre del usuario
➜ {mencion} — mención @usuario
➜ {grupo} — nombre del grupo
➜ {miembros} — total de miembros

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    const msg = m.message || {};
    const hasImage = msg.imageMessage || msg.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (hasImage) {
      try {
        let imgBuffer;
        if (typeof downloadMediaMessage === 'function') {
          imgBuffer = await downloadMediaMessage(m, 'buffer', {});
        } else {
          const { downloadMediaMessage: dlMedia } = await import('@whiskeysockets/baileys');
          imgBuffer = await dlMedia(m, 'buffer', {});
        }

        if (!imgBuffer || !imgBuffer.length) throw new Error('No se pudo descargar la imagen');

        const base64 = imgBuffer.toString('base64');
        const textoPorArgs = args.slice(1).join(' ').trim() || null;

        groupOptions[from] = {
          ...groupOpts,
          bienvenida: true,
          welcomeImage: base64,
          ...(textoPorArgs ? { welcomeText: textoPorArgs } : {}),
        };
        saveSettings({ groupOptions });

        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

➜ ✅ Imagen personalizada guardada
${textoPorArgs ? '➜ ✅ Texto actualizado' : '➜ Texto sin cambios'}
➜ Bienvenida activada automáticamente

${BORDER_TOP}
${BORDER_BOTTOM}`
        }, { quoted: m });
      } catch (e) {
        return client.sendMessage(from, {
          text: `❌ No se pudo guardar la imagen.\n> ${e.message || ''}`
        }, { quoted: m });
      }
    }

    const texto = args.join(' ').trim();

    if (!texto) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

【 ᴜꜱᴏ 】

➜ ${prefix}setwelcome <texto>
➜ Personaliza el mensaje de bienvenida

➜ ${prefix}setwelcome on/off
➜ Activa o desactiva la bienvenida

➜ ${prefix}setwelcome reset
➜ Vuelve al mensaje por defecto

➜ ${prefix}setwelcome ver
➜ Muestra la configuración actual

➜ Envía una imagen con caption ${prefix}setwelcome
➜ Guarda esa imagen como portada

【 ᴠᴀʀɪᴀʙʟᴇꜱ 】

➜ {nombre} — nombre del usuario
➜ {mencion} — mención @usuario
➜ {grupo} — nombre del grupo
➜ {miembros} — total de miembros

【 ᴇᴊᴇᴍᴘʟᴏ 】

➜ ${prefix}setwelcome Bienvenido {nombre} a {grupo}

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    groupOptions[from] = { ...groupOpts, bienvenida: true, welcomeText: texto };
    saveSettings({ groupOptions });

    return client.sendMessage(from, {
      text:
`${BORDER_TOP}
       ʙɪᴇɴᴠᴇɴɪᴅᴀ
${BORDER_BOTTOM}

➜ ✅ Mensaje personalizado guardado
➜ Bienvenida activada automáticamente

> ${texto}

${BORDER_TOP}
${BORDER_BOTTOM}`
    }, { quoted: m });
  },
};