module.exports = {
  command: ['n'],
  description: 'Responde con el mismo mensaje que el usuario envió',
  categoria: 'grupos',

  run: async (client, m, args, from, isOwner, ctx = {}) => {
    const texto = args.join(' ');

    if (!texto) {
      return client.sendMessage(from, {
        text: '➜ Escribe algo después de .n'
      }, { quoted: m });
    }

    await client.sendMessage(from, {
      text: texto
    }, { quoted: m });
  }
};