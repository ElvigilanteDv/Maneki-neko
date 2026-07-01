module.exports = {
  command: ['infocreador'],
  description: 'Informacion del bot y creador',
  categoria: 'sistema',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const prefix = ctx?.prefix || '.';
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const tiempo = `${hours}h ${minutes}m ${seconds}s`;

    const mensaje = 
`INFORMACION DEL BOT

CREADOR:
Nombre: Edward
Pais: Honduras
Edad: 14 años
Rol: Desarrollador de bots WhatsApp

SOBRE EL BOT:
Nombre: Maneki-Neko
Version: 2.0
Estado: Activo
Uptime: ${tiempo}
Comandos: ${global.comandos ? global.comandos.size : 0}

DESCRIPCION:
Bot multifuncional para WhatsApp con
sistema RPG, IA, moderacion y mas.

Usa ${prefix}menu para ver comandos`;

    await client.sendMessage(from, {
      text: mensaje
    }, { quoted: m });
  }
};