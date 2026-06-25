module.exports = {
  command: ['menu', 'help', 'comandos'],
  description: 'Muestra el menú de comandos',
  categoria: 'sistema',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const prefix   = ctx?.prefix || '.';
    const settings = ctx?.settings || {};
    const axios    = ctx?.axios;
    const apiReady = Boolean(String(settings.apiBaseUrl || '').trim() && String(settings.apiKey || '').trim());

    const sender = m.key.participant || m.key.remoteJid;
    const users = ctx?.getUsers ? ctx.getUsers() : {};
    const isReg = users[sender] || false;

    if (!isReg && !isCreator) {
      return client.sendMessage(from, {
        text: `❌ No estás registrado.\n\n➜ Usa *${prefix}register* para registrarte primero.`
      }, { quoted: m });
    }

    const up = Math.floor(process.uptime());
    const h  = Math.floor(up / 3600);
    const mm = Math.floor((up % 3600) / 60);
    const ss = up % 60;
    const uptime =
      String(h).padStart(2,'0') + ':' +
      String(mm).padStart(2,'0') + ':' +
      String(ss).padStart(2,'0');

    const CAT_META = {
      descargas:    { title: 'ᴅᴇꜱᴄᴀʀɢᴀꜱ'    },
      grupos:       { title: 'ɢʀᴜᴘᴏꜱ'       },
      juegos:       { title: 'ʀᴘɢ ʏ ᴊᴜᴇɢᴏꜱ' },
      herramientas: { title: 'ʜᴇʀʀᴀᴍɪᴇɴᴛᴀꜱ' },
      sistema:      { title: 'ꜱɪꜱᴛᴇᴍᴀ'      },
      owner:        { title: 'ᴏᴡɴᴇʀ'        },
      anime:        { title: 'ᴀɴɪᴍᴇ'        },
    };

    const CAT_ORDER = ['descargas', 'grupos', 'juegos', 'herramientas', 'sistema', 'owner', 'anime'];

    const HIDDEN = new Set(['menu','help','comandos']);

    const grouped = {};
    const seen    = new Set();

    if (global.comandos) {
      for (const [, mod] of global.comandos) {
        const mainCmd = Array.isArray(mod.command) ? mod.command[0] : mod.command;
        if (!mainCmd || seen.has(mainCmd) || HIDDEN.has(mainCmd)) continue;
        seen.add(mainCmd);
        const cat = String(mod.categoria || 'general').toLowerCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ cmd: mainCmd, desc: mod.description || '' });
      }
    }

    const allCats = [
      ...CAT_ORDER.filter(c => grouped[c]?.length),
      ...Object.keys(grouped).filter(c => !CAT_ORDER.includes(c) && grouped[c]?.length),
    ];

    let sections = '';
    allCats.forEach((cat) => {
      const meta = CAT_META[cat] || { title: cat.toUpperCase() };
      let block  = `『 ${meta.title} 』\n\n`;
      for (const { cmd, desc } of grouped[cat]) {
        block += `✰ ${prefix}${cmd}\n`;
        if (desc) block += `> ${desc}\n`;
      }
      block += `\n`;
      sections += block;
    });

    const caption =
`❀ *Maneki-Neko Bot*
✰ _Prefijo_ » \`${prefix}\`
● _API_ » ${apiReady ? 'Activa' : 'Pendiente'}
◆ _Uptime_ » ${uptime}
ꕥ _Comandos_ » ${seen.size}

${sections}> *➮ Usa _${prefix}help_ para ver este menú en cualquier momento.*`;

    // ─── OBTENER FOTO DEL BOT ────────────────────────────────────────────
    let botImage = null;
    try {
      const botJid = client.user.id;
      const ppUrl = await client.profilePictureUrl(botJid, 'image');
      if (ppUrl) {
        const resp = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
        botImage = Buffer.from(resp.data);
      }
    } catch {}

    // ─── ENVIAR MENÚ CON FOTO DEL BOT O FALLBACK ────────────────────────
    if (botImage) {
      await client.sendMessage(from, {
        image: botImage,
        caption: caption
      }, { quoted: m });
    } else {
      const IMAGE_URL = 'https://files.catbox.moe/8r6m4c.jpg';
      try {
        const resp = await axios.get(IMAGE_URL, { responseType: 'arraybuffer', timeout: 10000 });
        await client.sendMessage(from, {
          image: Buffer.from(resp.data),
          caption: caption
        }, { quoted: m });
      } catch {
        await client.sendMessage(from, {
          text: caption
        }, { quoted: m });
      }
    }
  },
};