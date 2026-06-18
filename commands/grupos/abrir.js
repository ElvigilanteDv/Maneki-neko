module.exports = {
  command: ['abrir', 'open', 'ogroup'],
  description: 'Abre el grupo (todos pueden enviar mensajes)',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from) => {
    if (!m.key.remoteJid.endsWith('@g.us')) {
      await client.sendMessage(from, {
        text: '❌ Este comando solo funciona en grupos.'
      }, { quoted: m });
      return;
    }

    const groupMetadata = await client.groupMetadata(from);
    const senderId = m.key.participant || m.key.remoteJid;
    
    let isAdmin = false;
    for (const p of groupMetadata.participants) {
      const pId = String(p.id || '');
      if (pId === senderId || pId === m.key.participant) {
        if (p.admin !== null) {
          isAdmin = true;
          break;
        }
      }
    }

    if (!isAdmin) {
      await client.sendMessage(from, {
        text: '❌ Solo los administradores pueden abrir el grupo.'
      }, { quoted: m });
      return;
    }

    const botId = client.user.id;
    let isBotAdmin = false;
    for (const p of groupMetadata.participants) {
      const pId = String(p.id || '');
      if (pId === botId) {
        if (p.admin !== null) {
          isBotAdmin = true;
          break;
        }
      }
    }

    if (!isBotAdmin) {
      await client.sendMessage(from, {
        text: '❌ El bot no es administrador, no puedo abrir el grupo.'
      }, { quoted: m });
      return;
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    try {
      await client.groupSettingUpdate(from, 'not_announcement');

      const caption = `${BORDER_TOP}
       _Grupo Abierto_
${BORDER_BOTTOM}

✅ El grupo ha sido _abierto_.
> Todos los miembros pueden enviar mensajes.

${BORDER_TOP}
${BORDER_BOTTOM}`;

      await client.sendMessage(from, { text: caption }, { quoted: m });
    } catch (error) {
      console.error('Error al abrir grupo:', error);
      await client.sendMessage(from, {
        text: '❌ Error al abrir el grupo.'
      }, { quoted: m });
    }
  }
};