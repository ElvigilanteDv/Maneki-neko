const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'runtime', 'rpg_data.json');

const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

const CLASES = {
  guerrero: { nombre: '⚔️ Guerrero',  hp: 160, atk: 22, def: 16, emoji: '⚔️' },
  mago:     { nombre: '🔮 Mago',      hp:  80, atk: 38, def:  6, emoji: '🔮' },
  arquero:  { nombre: '🏹 Arquero',   hp: 110, atk: 30, def: 10, emoji: '🏹' },
};

const MONSTRUOS = [
  { nombre: '🟢 Slime',      hp: 35,  atk:  8, def:  1, exp: 20,  oro: 10,  nivel: 1 },
  { nombre: '👺 Goblin',     hp: 55,  atk: 14, def:  4, exp: 35,  oro: 20,  nivel: 1 },
  { nombre: '🐺 Lobo',       hp: 75,  atk: 20, def:  6, exp: 55,  oro: 35,  nivel: 3 },
  { nombre: '🧟 Zombi',      hp: 90,  atk: 18, def:  8, exp: 65,  oro: 40,  nivel: 3 },
  { nombre: '👹 Orco',       hp: 120, atk: 26, def: 12, exp: 90,  oro: 60,  nivel: 6 },
  { nombre: '🧙 Brujo',      hp: 100, atk: 34, def:  8, exp: 110, oro: 75,  nivel: 6 },
  { nombre: '🐉 Dragón',     hp: 200, atk: 42, def: 18, exp: 200, oro: 150, nivel: 10 },
  { nombre: '😈 Demonio',    hp: 170, atk: 45, def: 14, exp: 220, oro: 170, nivel: 10 },
  { nombre: '💀 Lich',       hp: 250, atk: 50, def: 20, exp: 350, oro: 250, nivel: 15 },
];

function expParaNivel(nivel) {
  return Math.floor(100 * Math.pow(nivel, 1.6));
}

function cargarDatos() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch { return {}; }
}

function guardarDatos(datos) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(datos, null, 2));
  } catch {}
}

function getJugador(datos, jid) {
  return datos[jid] || null;
}

function crearJugador(clase) {
  const base = CLASES[clase];
  return {
    clase,
    nivel:    1,
    exp:      0,
    hp:       base.hp,
    maxHp:    base.hp,
    atk:      base.atk,
    def:      base.def,
    oro:      0,
    victorias: 0,
    derrotas:  0,
    ultimaBatalla: 0,
  };
}

function subirNivel(jugador) {
  jugador.nivel += 1;
  const base = CLASES[jugador.clase];
  jugador.maxHp = Math.floor(base.hp  + jugador.nivel * 12);
  jugador.atk   = Math.floor(base.atk + jugador.nivel * 3);
  jugador.def   = Math.floor(base.def + jugador.nivel * 2);
  jugador.hp    = jugador.maxHp;
}

function simularBatalla(jugador, monstruo) {
  let hpJ = jugador.hp;
  let hpM = monstruo.hp;
  const turnos = [];
  let turno = 1;

  while (hpJ > 0 && hpM > 0 && turno <= 20) {
    const danoJ = Math.max(1, jugador.atk - monstruo.def + Math.floor(Math.random() * 5));
    hpM -= danoJ;
    if (hpM <= 0) { turnos.push(`T${turno}: Atacas por ${danoJ} dmg ⚔️`); break; }
    const danoM = Math.max(1, monstruo.atk - jugador.def + Math.floor(Math.random() * 5));
    hpJ -= danoM;
    turnos.push(`T${turno}: Atacas ${danoJ} | Recibes ${danoM}`);
    turno++;
  }

  return { gano: hpJ > 0, hpRestante: Math.max(0, hpJ), turnos: turnos.slice(0, 5) };
}

function barraHp(hp, maxHp, largo = 10) {
  const lleno = Math.round((hp / maxHp) * largo);
  return '█'.repeat(lleno) + '░'.repeat(largo - lleno);
}

function elegirMonstruo(nivel) {
  const posibles = MONSTRUOS.filter(m => m.nivel <= Math.max(1, nivel + 2));
  return posibles[Math.floor(Math.random() * posibles.length)];
}

module.exports = {
  command: ['rpg', 'pelear', 'perfil', 'ranking'],
  description: 'Sistema RPG: crea tu personaje y combate monstruos',
  categoria: 'juegos',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const prefix  = ctx?.prefix || '#';
    const sender  = m.key.participant || m.key.remoteJid;
    const senderNum = sender.split('@')[0].split(':')[0];
    const rawCmd  = String(
      m?.message?.conversation ||
      m?.message?.extendedTextMessage?.text || ''
    ).trim().toLowerCase().split(/\s+/)[0].replace(/^#/, '');

    const datos = cargarDatos();
    const jugador = getJugador(datos, sender);

    if (rawCmd === 'perfil') {
      if (!jugador) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ᴍᴀɴᴇᴋɪ ᴏɴʟɪɴᴇ
${BORDER_BOTTOM}

⊹ No tienes personaje aún.
➜ Usa *${prefix}rpg crear* para empezar

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const base   = CLASES[jugador.clase];
      const expSig = expParaNivel(jugador.nivel);
      const barra  = barraHp(jugador.hp, jugador.maxHp);

      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʀᴘɢ — ᴘᴇʀꜰɪʟ
${BORDER_BOTTOM}

👤 @${senderNum}
${base.emoji} Clase: *${base.nombre}*

『 ᴇꜱᴛᴀᴅíꜱᴛɪᴄᴀꜱ 』

⊹ Nivel:   ${jugador.nivel}
⊹ EXP:     ${jugador.exp} / ${expSig}
⊹ HP:      [${barra}] ${jugador.hp}/${jugador.maxHp}
⊹ ATK:     ${jugador.atk}
⊹ DEF:     ${jugador.def}
⊹ Oro:     ${jugador.oro} 🪙

『 ʜɪꜱᴛᴏʀɪᴀʟ 』

⊹ Victorias: ${jugador.victorias} ✅
⊹ Derrotas:  ${jugador.derrotas} ❌

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`,
        mentions: [sender],
      }, { quoted: m });
    }

    if (rawCmd === 'ranking') {
      const jugadores = Object.entries(datos)
        .filter(([, j]) => j && j.nivel)
        .sort((a, b) => b[1].nivel - a[1].nivel || b[1].victorias - a[1].victorias)
        .slice(0, 10);

      if (!jugadores.length) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ʀᴀɴᴋɪɴɢ
${BORDER_BOTTOM}

⊹ Aún no hay jugadores registrados.

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      let lista = '';
      jugadores.forEach(([jid, j], i) => {
        const num = jid.split('@')[0].split(':')[0];
        const base = CLASES[j.clase] || { emoji: '⚔️' };
        lista += `${medallas[i]} ${base.emoji} Nv.${j.nivel} — @${num} — 🏆 ${j.victorias}V\n`;
      });

      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʀᴘɢ — ʀᴀɴᴋɪɴɢ
${BORDER_BOTTOM}

${lista}
${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`,
        mentions: jugadores.map(([jid]) => jid),
      }, { quoted: m });
    }

    if (rawCmd === 'pelear') {
      if (!jugador) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ʙᴀᴛᴀʟʟᴀ
${BORDER_BOTTOM}

⊹ No tienes personaje aún.
➜ Usa *${prefix}rpg crear* para empezar

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const ahora = Date.now();
      const cooldown = 30 * 1000;
      if (ahora - jugador.ultimaBatalla < cooldown) {
        const restante = Math.ceil((cooldown - (ahora - jugador.ultimaBatalla)) / 1000);
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ʙᴀᴛᴀʟʟᴀ
${BORDER_BOTTOM}

⊹ ⏳ Descansando... ${restante}s restantes
> Espera antes de volver a pelear

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      if (jugador.hp <= 0) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ʙᴀᴛᴀʟʟᴀ
${BORDER_BOTTOM}

⊹ 💀 Estás derrotado y sin HP.
➜ Usa *${prefix}rpg curar* o espera regeneración.
> (Tu HP regenera 1 punto cada 10 minutos)

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const regen = Math.floor((ahora - jugador.ultimaBatalla) / (10 * 60 * 1000));
      if (regen > 0) {
        jugador.hp = Math.min(jugador.maxHp, jugador.hp + regen);
      }

      const monstruo = elegirMonstruo(jugador.nivel);
      const resultado = simularBatalla(jugador, monstruo);

      jugador.ultimaBatalla = ahora;
      jugador.hp = resultado.hpRestante;

      const turnosStr = resultado.turnos.join('\n⊹ ');

      if (resultado.gano) {
        jugador.victorias += 1;
        jugador.exp  += monstruo.exp;
        jugador.oro  += monstruo.oro;

        let subiNivel = '';
        while (jugador.exp >= expParaNivel(jugador.nivel)) {
          jugador.exp -= expParaNivel(jugador.nivel);
          subirNivel(jugador);
          subiNivel += `\n✨ *¡Subiste al nivel ${jugador.nivel}!* ATK+3 DEF+2`;
        }

        datos[sender] = jugador;
        guardarDatos(datos);

        const barra = barraHp(jugador.hp, jugador.maxHp);

        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ᴠɪᴄᴛᴏʀɪᴀ ✅
${BORDER_BOTTOM}

⚔️ @${senderNum} vs ${monstruo.nombre}

『 ᴄᴏᴍʙᴀᴛᴇ 』

⊹ ${turnosStr}

『 ʀᴇᴄᴏᴍᴘᴇɴꜱᴀ 』

⊹ +${monstruo.exp} EXP  |  +${monstruo.oro} 🪙 Oro
⊹ HP: [${barra}] ${jugador.hp}/${jugador.maxHp}${subiNivel}

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`,
          mentions: [sender],
        }, { quoted: m });

      } else {
        jugador.derrotas += 1;
        jugador.hp = 0;

        datos[sender] = jugador;
        guardarDatos(datos);

        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ᴅᴇʀʀᴏᴛᴀ ❌
${BORDER_BOTTOM}

💀 @${senderNum} fue derrotado por ${monstruo.nombre}

『 ᴄᴏᴍʙᴀᴛᴇ 』

⊹ ${turnosStr}

⊹ HP: [░░░░░░░░░░] 0/${jugador.maxHp}
> Tu HP regenera con el tiempo...

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`,
          mentions: [sender],
        }, { quoted: m });
      }
    }

    const subCmd = args[0]?.toLowerCase();

    if (subCmd === 'crear') {
      if (jugador) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ᴍᴀɴᴇᴋɪ ᴏɴʟɪɴᴇ
${BORDER_BOTTOM}

⊹ Ya tienes un personaje creado.
➜ Usa *${prefix}perfil* para verlo

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const claseArg = String(args[1] || '').toLowerCase();
      if (!CLASES[claseArg]) {
        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       ʀᴘɢ — ᴇʟɪɢᴇ ᴄʟᴀꜱᴇ
${BORDER_BOTTOM}

『 ᴄʟᴀꜱᴇꜱ 』

⊹ ⚔️ *Guerrero* — HP 160 | ATK 22 | DEF 16
  > Tanque resistente, ideal para principiantes

⊹ 🔮 *Mago* — HP 80 | ATK 38 | DEF 6
  > Alto daño pero frágil, para expertos

⊹ 🏹 *Arquero* — HP 110 | ATK 30 | DEF 10
  > Equilibrado, versátil en combate

➜ Uso: *${prefix}rpg crear guerrero*
➜ Uso: *${prefix}rpg crear mago*
➜ Uso: *${prefix}rpg crear arquero*

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
        }, { quoted: m });
      }

      const nuevo = crearJugador(claseArg);
      datos[sender] = nuevo;
      guardarDatos(datos);

      const base = CLASES[claseArg];

      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ʀᴘɢ — ᴘᴇʀꜱᴏɴᴀᴊᴇ ᴄʀᴇᴀᴅᴏ
${BORDER_BOTTOM}

🎉 @${senderNum} ¡Bienvenido!

${base.emoji} Clase: *${base.nombre}*

⊹ HP:  ${nuevo.maxHp}
⊹ ATK: ${nuevo.atk}
⊹ DEF: ${nuevo.def}

『 ᴄᴏᴍᴀɴᴅᴏꜱ 』

⊹ ${prefix}pelear   — combatir monstruos
⊹ ${prefix}perfil   — ver tus estadísticas
⊹ ${prefix}ranking  — top jugadores

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`,
        mentions: [sender],
      }, { quoted: m });
    }

    return client.sendMessage(from, {
      text:
`${BORDER_TOP}
       ʀᴘɢ — ᴍᴀɴᴇᴋɪ ᴏɴʟɪɴᴇ
${BORDER_BOTTOM}

『 ᴄᴏᴍᴀɴᴅᴏꜱ ʀᴘɢ 』

⊹ ${prefix}rpg crear <clase>
> Crea tu personaje (guerrero/mago/arquero)

⊹ ${prefix}pelear
> Combate un monstruo aleatorio

⊹ ${prefix}perfil
> Ve tus estadísticas y progreso

⊹ ${prefix}ranking
> Top 10 jugadores

『 ᴄʟᴀꜱᴇꜱ 』

⊹ ⚔️ Guerrero — tanque resistente
⊹ 🔮 Mago     — alto daño, poderoso 
⊹ 🏹 Arquero  — equilibrado

${BORDER_TOP}
       🐾 Maneki Online
${BORDER_BOTTOM}`
    }, { quoted: m });
  },
};
