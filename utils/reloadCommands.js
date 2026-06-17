'use strict';

const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(process.cwd(), 'commands');

/**
 * Carga y recarga todos los comandos desde la carpeta /commands
 * (sin cargar subcarpetas).
 * Guarda los comandos en global.comandos (Map).
 */
function reloadCommands() {
  if (!global.comandos) {
    global.comandos = new Map();
  } else {
    global.comandos.clear();
  }

  let total = 0;

  if (!fs.existsSync(COMMANDS_DIR)) {
    console.log('[reloadCommands] Carpeta commands no encontrada.');
    return;
  }

  const entries = fs.readdirSync(COMMANDS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(COMMANDS_DIR, entry.name);

    // Ignorar carpetas
    if (entry.isDirectory()) continue;

    // Solo archivos .js
    if (!entry.name.endsWith('.js')) continue;

    try {
      // Limpiar caché para recarga en caliente
      delete require.cache[require.resolve(fullPath)];

      const mod = require(fullPath);

      // Ignorar archivos sin comando
      if (!mod || !mod.command) continue;

      const aliases = Array.isArray(mod.command)
        ? mod.command
        : [mod.command];

      for (const alias of aliases) {
        if (typeof alias === 'string' && alias.trim()) {
          global.comandos.set(alias.trim().toLowerCase(), mod);
        }
      }

      total++;
    } catch (err) {
      console.error(`[reloadCommands] Error cargando ${fullPath}: ${err.message}`);
    }
  }

  console.log(
    `[reloadCommands] ${global.comandos.size} aliases cargados desde ${total} archivos.`
  );
}

module.exports = { reloadCommands };