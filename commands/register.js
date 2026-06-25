const fs   = require('fs');
const path = require('path');

const USERS_FILE = path.join(process.cwd(), 'runtime', 'users.json');

function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')) || {};
  } catch { return {}; }
}

function saveUsers(users) {
  try {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch {}
}

module.exports = {
  command: ['register', 'registro', 'reg'],
  description: 'Regístrate para usar el bot',
  categoria: 'sistema',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix = ctx?.prefix || '.';
    const axios  = ctx?.axios;

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const sender  = m.key.participant || m.key.remoteJid;
    const senderNum = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');

    const users = loadUsers();

    if (users[senderNum]) {
      const u = users[senderNum];
      let pfpBuffer = null;
      try {
        const ppUrl = await client.profilePictureUrl(`${senderNum}@s.whatsapp.net`, 'image');
        if (ppUrl && axios) {
          const resp = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
          pfpBuffer = Buffer.from(resp.data);
        }
      } catch {}

      const caption =
`${BORDER_TOP}
       ʏᴀ ᴇꜱᴛᴀꜱ ʀᴇɢɪꜱᴛʀᴀᴅᴏ
${BORDER_BOTTOM}

✰ Usuario » @${senderNum}
❀ Nombre » ${u.nombre}
● Edad » ${u.edad} años
ꕥ Registrado » ${u.fecha}

> Usa ${prefix}perfil para ver tu información completa

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`;

      if (pfpBuffer) {
        return client.sendMessage(from, { image: pfpBuffer, caption, mentions: [sender] }, { quoted: m });
      }
      return client.sendMessage(from, { text: caption, mentions: [sender] }, { quoted: m });
    }

    // ── Validar argumentos: .register Nombre Edad ─────────────────────────────
    if (args.length < 2) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʀᴇɢɪꜱᴛʀᴏ
${BORDER_BOTTOM}

❀ Para registrarte escribe:
> ${prefix}register <nombre> <edad>

● Ejemplo:
> ${prefix}register Sakura 20

ꕥ Solo necesitas hacerlo una vez

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    const edad   = parseInt(args[args.length - 1]);
    const nombre = args.slice(0, -1).join(' ').trim();

    if (!nombre || nombre.length < 2 || nombre.length > 30) {
      return client.sendMessage(from, {
        text: '❌ El nombre debe tener entre 2 y 30 caracteres.'
      }, { quoted: m });
    }

    if (isNaN(edad) || edad < 1 || edad > 99) {
      return client.sendMessage(from, {
        text: '❌ La edad debe ser un número entre 1 y 99.'
      }, { quoted: m });
    }

    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    users[senderNum] = { nombre, edad, fecha, registrado: ahora.getTime() };
    saveUsers(users);

    // ── Intentar obtener foto de perfil ───────────────────────────────────────
    let pfpBuffer = null;
    try {
      const ppUrl = await client.profilePictureUrl(`${senderNum}@s.whatsapp.net`, 'image');
      if (ppUrl && axios) {
        const resp = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 });
        pfpBuffer = Buffer.from(resp.data);
      }
    } catch {}

    const caption =
`${BORDER_TOP}
       ʀᴇɢɪꜱᴛʀᴏ ᴄᴏᴍᴘʟᴇᴛᴏ
${BORDER_BOTTOM}

❀ Bienvenido/a a *Maneki-Neko Bot*
✰ Usuario » @${senderNum}
● Nombre » ${nombre}
◆ Edad » ${edad} años
ꕥ Fecha » ${fecha}

૮꒰ ˶• ᴗ •˶꒱ა ¡Ya puedes usar todos los comandos!
> Escribe ${prefix}menu para ver la lista

${BORDER_TOP}
       🐾 El Vigilante
${BORDER_BOTTOM}`;

    if (pfpBuffer) {
      return client.sendMessage(from, { image: pfpBuffer, caption, mentions: [sender] }, { quoted: m });
    }
    return client.sendMessage(from, { text: caption, mentions: [sender] }, { quoted: m });
  },
};
