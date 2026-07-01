module.exports = {
  command: ['infocreador', 'infoc', 'creatorinfo'],
  description: 'Informacion del creador del bot',
  categoria: 'sistema',

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const prefix = ctx?.prefix || '.';

    const mensaje = 
`• INFORMACION DEL CREADOR •

• Nombre: Edward
• Pais: Honduras
• Edad: 14 años
• Rol: Desarrollador de bots WhatsApp

• Bot: Maneki-Neko
• Version: 1.0

• Usa ${prefix}menu para ver comandos`;

    await client.sendMessage(from, {
      text: mensaje
    }, { quoted: m });
  }
};