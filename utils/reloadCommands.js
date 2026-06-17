'use strict';

const fs = require('fs');
const path = require('path');

const COMMANDS_DIR = path.join(process.cwd(), 'commands');

/**
 * Carga y recarga todos los comandos desde la carpeta /commands
 * (incluyendo subcarpetas de forma recursiva).
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

  /**
   * Función recursiva para cargar comandos de una carpeta y subcarpetas
   */
  function loadFromDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Si es carpeta, cargar recursivamente
      if (entry.isDirectory()) {
        loadFromDir(fullPath);
        continue;
      }

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
  }

  // Iniciar carga desde la carpeta raíz de comandos
  loadFromDir(COMMANDS_DIR);

  console.log(
    `[reloadCommands] ${global.comandos.size} aliases cargados desde ${total} archivos.`
  );
}

module.exports = { reloadCommands };
