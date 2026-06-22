module.exports = {
  command: ['inactivos', 'inactive'],
  description: 'Muestra los miembros inactivos del grupo',
  categoria: 'grupos',
  admin: true,
  group: true,

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';
    const prefix        = ctx?.prefix || '.';

    // ── Días de inactividad (default 7, configurable con .inactivos 30) ───────
    const dias = Math.max(1, Math.min(90, parseInt(args[0]) || 7));
    const limiteMs = dias * 24 * 60 * 60 * 1000;
    const ahora    = Date.now();

    // ── Obtener metadata del grupo ────────────────────────────────────────────
    let metadata = null;
    try {
      metadata = await client.groupMetadata(from);
    } catch {
      return client.sendMessage(from, {
        text: '❌ No se pudo obtener información del grupo.'
      }, { quoted: m });
    }

    const participants = metadata?.participants || [];
    if (!participants.length) {
      return client.sendMessage(from, {
        text: '❌ No se encontraron miembros en el grupo.'
      }, { quoted: m });
    }

    // ── Leer el tracker de actividad ──────────────────────────────────────────
    const groupActivity = global.__groupActivity?.get(from) || new Map();

    // ── Clasificar miembros ───────────────────────────────────────────────────
    const inactivos = [];
    const sinRegistro = [];

    for (const p of participants) {
      const pNum = String(p.id || '').split('@')[0].split(':')[0].replace(/\D/g, '');
      if (!pNum) continue;

      const lastSeen = groupActivity.get(pNum);

      if (!lastSeen) {
        // Sin registro desde que el bot está encendido
        sinRegistro.push(pNum);
      } else if (ahora - lastSeen > limiteMs) {
        const diasInactivo = Math.floor((ahora - lastSeen) / (24 * 60 * 60 * 1000));
        inactivos.push({ num: pNum, dias: diasInactivo });
      }
    }

    // Ordenar inactivos de mayor a menor tiempo sin actividad
    inactivos.sort((a, b) => b.dias - a.dias);

    const totalInactivos = inactivos.length + sinRegistro.length;

    if (totalInactivos === 0) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       ɪɴᴀᴄᴛɪᴠᴏꜱ
${BORDER_BOTTOM}

⊹ ✅ No hay inactivos
> Todos han hablado en los últimos ${dias} días

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }

    // ── Construir lista ───────────────────────────────────────────────────────
    let lista = '';

    if (inactivos.length) {
      lista += `【 ꜱɪɴ ʜᴀʙʟᴀʀ +${dias} ᴅíᴀꜱ 】\n\n`;
      inactivos.slice(0, 20).forEach((u, i) => {
        lista += `⊹ ${i + 1}. @${u.num}\n> ${u.dias} días sin actividad\n`;
      });
      if (inactivos.length > 20) lista += `> ...y ${inactivos.length - 20} más\n`;
      lista += '\n';
    }

    if (sinRegistro.length) {
      lista += `【 ꜱɪɴ ʀᴇɢɪꜱᴛʀᴏ ᴅᴇꜱᴅᴇ ǫᴜᴇ ᴇʟ ʙᴏᴛ ᴀʀʀᴀɴᴄó 】\n\n`;
      sinRegistro.slice(0, 20).forEach((num, i) => {
        lista += `⊹ ${i + 1}. @${num}\n`;
      });
      if (sinRegistro.length > 20) lista += `> ...y ${sinRegistro.length - 20} más\n`;
    }

    const mentions = [
      ...inactivos.slice(0, 20).map(u => `${u.num}@s.whatsapp.net`),
      ...sinRegistro.slice(0, 20).map(num => `${num}@s.whatsapp.net`),
    ];

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       ɪɴᴀᴄᴛɪᴠᴏꜱ
${BORDER_BOTTOM}

⊹ Período: ${dias} días
⊹ Total miembros: ${participants.length}
⊹ Inactivos: ${totalInactivos}

${lista}
【 ᴜꜱᴏ 】

⊹ ${prefix}inactivos — últimos 7 días
⊹ ${prefix}inactivos 30 — últimos 30 días

${BORDER_TOP}
${BORDER_BOTTOM}`,
      mentions,
    }, { quoted: m });
  },
};
