const { exec } = require('child_process')

const OWNERS = ['59177474230@s.whatsapp.net', '573223090406@s.whatsapp.net']

module.exports = {
  command: ['update', 'actualizar', 'gitpull'],
  description: 'Actualiza el bot desde el repositorio oficial',
  categoria: 'sistema',
  owner: true,

  run: async (client, m, args, from) => {
    const sender = m.sender || m.key?.participant || m.key?.remoteJid || ''
    const isOwner = OWNERS.includes(sender)

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮'
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯'

    if (!isOwner) {
      return client.sendMessage(from, {
        text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: 🔒 Solo owners\n⊹ Este comando es exclusivo\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
      }, { quoted: m }).catch(() => {})
    }

    const startTime = Date.now()

    const sent = await client.sendMessage(
      from,
      { text: `${BORDER_TOP}\n       ⏳ ᴀᴄᴛᴜᴀʟɪᴢᴀɴᴅᴏ...\n${BORDER_BOTTOM}` },
      { quoted: m }
    )

    exec('git fetch && git status', async (err, stdout, stderr) => {
      if (err) {
        let errorMsg = err.message || ''
        let motivo = ''

        if (errorMsg.includes('not a git repository')) {
          motivo = '⊹ No es un repositorio git'
        } else if (errorMsg.includes('Could not resolve host')) {
          motivo = '⊹ Sin conexión a internet'
        } else {
          motivo = `⊹ ${errorMsg.slice(0, 60)}`
        }

        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: ❌ Error\n${motivo}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m }).catch(() => {})
      }

      if (stdout.includes('Your branch is up to date')) {
        const latency = Date.now() - startTime
        return client.sendMessage(from, {
          text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: ✅ Ya está actualizado\n⊹ No hay cambios pendientes\n⊹ Tiempo: ${latency}ms\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
        }, { quoted: m }).catch(() => {})
        return
      }

      exec('git stash && git pull --force', async (err2, stdout2, stderr2) => {
        const latency = Date.now() - startTime

        if (err2) {
          let errorMsg = err2.message || ''
          let motivo = ''

          if (errorMsg.includes('Merge conflict') || errorMsg.includes('CONFLICT')) {
            motivo = '⊹ Conflicto de fusión detectado\n> Resuelve manualmente o usa git reset --hard'
          } else if (errorMsg.includes('Please commit') || errorMsg.includes('overwritten')) {
            motivo = '⊹ Hay cambios locales sin guardar\n> Usa git stash && git pull'
          } else {
            motivo = `⊹ ${errorMsg.slice(0, 60)}`
          }

          return client.sendMessage(from, {
            text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: ❌ Error\n${motivo}\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
          }, { quoted: m }).catch(() => {})
        }

        if (stdout2.includes('Already up to date')) {
          return client.sendMessage(from, {
            text: `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: ✅ Ya está actualizado\n⊹ No había cambios reales\n⊹ Tiempo: ${latency}ms\n\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`
          }, { quoted: m }).catch(() => {})
          return
        }

        let creados    = (stdout2.match(/create mode \d+ (.+)/g) || []).map(c => c.split(' ').pop())
        let eliminados = (stdout2.match(/delete mode \d+ (.+)/g) || []).map(c => c.split(' ').pop())
        let cambiados  = stdout2.match(/(\d+) files? changed/)
        let inserciones = stdout2.match(/(\d+) insertions?\(\+\)/)
        let borrados    = stdout2.match(/(\d+) deletions?\(-\)/)

        let caption = `${BORDER_TOP}\n       ᴍᴀɴᴇᴋɪ-ɴᴇᴋᴏ ʙᴏᴛ\n${BORDER_BOTTOM}\n\n『 ᴜᴘᴅᴀᴛᴇ 』\n\n⊹ Estado: ✅ Actualizado\n⊹ Tiempo: ${latency}ms\n`

        if (creados.length > 0) {
          caption += `\n⊹ ✦ Creados (${creados.length}):\n`
          creados.slice(0, 6).forEach(f => caption += `   › ${f}\n`)
          if (creados.length > 6) caption += `   › ...y ${creados.length - 6} más\n`
        }

        if (cambiados) {
          caption += `\n⊹ 📝 Modificados: ${cambiados[1]} archivo(s)\n`
        }

        if (eliminados.length > 0) {
          caption += `\n⊹ 🗑️ Eliminados (${eliminados.length}):\n`
          eliminados.slice(0, 6).forEach(f => caption += `   › ${f}\n`)
          if (eliminados.length > 6) caption += `   › ...y ${eliminados.length - 6} más\n`
        }

        if (inserciones) {
          caption += `\n⊹ ➕ Líneas agregadas: +${inserciones[1]}\n`
        }

        if (borrados) {
          caption += `\n⊹ ➖ Líneas eliminadas: -${borrados[1]}\n`
        }

        caption += `\n${BORDER_TOP}\n       🐾 El Vigilante\n${BORDER_BOTTOM}`

        await client.sendMessage(from, { text: caption }, { quoted: m }).catch(() => {})
      })
    })
  }
  }
