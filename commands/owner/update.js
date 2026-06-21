const { execSync, exec } = require('child_process');
const path               = require('path');
const fs                 = require('fs');

const REPO_URL    = process.env.UPDATE_REPO_URL    || 'https://github.com/ElvigilanteDv/Maneki-neko.git';
const REPO_BRANCH = process.env.UPDATE_REPO_BRANCH || 'main';

const PROTECTED = [
  'session',
  'settings.json',
  'runtime',
  'node_modules',
  '.env',
];

function runCmd(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwd || process.cwd(), timeout: 120000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(String(stdout || '').trim());
    });
  });
}

function runCmdSync(cmd, cwd) {
  try {
    return execSync(cmd, { cwd: cwd || process.cwd(), timeout: 30000 }).toString().trim();
  } catch (e) {
    return String(e?.stderr || e?.message || '');
  }
}

function backupFile(filePath, backupDir) {
  try {
    if (!fs.existsSync(filePath)) return false;
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(filePath, path.join(backupDir, path.basename(filePath)));
    return true;
  } catch {
    return false;
  }
}

function restoreFile(fileName, backupDir, cwd) {
  try {
    const src = path.join(backupDir, fileName);
    if (!fs.existsSync(src)) return false;
    fs.copyFileSync(src, path.join(cwd, fileName));
    return true;
  } catch {
    return false;
  }
}

function getDiffStats(cwd, fromHash, toHash) {
  try {
    const statRaw = runCmdSync(
      `git diff --stat ${fromHash}..${toHash} -- . ":(exclude)node_modules"`,
      cwd
    );
    const shortRaw = runCmdSync(
      `git diff --shortstat ${fromHash}..${toHash} -- . ":(exclude)node_modules"`,
      cwd
    );
    const nameStatus = runCmdSync(
      `git diff --name-status ${fromHash}..${toHash} -- . ":(exclude)node_modules"`,
      cwd
    );
    const commitLog = runCmdSync(
      `git log --oneline ${fromHash}..${toHash}`,
      cwd
    );
    return { statRaw, shortRaw, nameStatus, commitLog };
  } catch {
    return { statRaw: '', shortRaw: '', nameStatus: '', commitLog: '' };
  }
}

function parseFileChanges(nameStatus) {
  const lines = String(nameStatus || '').split('\n').filter(Boolean);
  const added    = [];
  const modified = [];
  const deleted  = [];

  for (const line of lines) {
    const parts = line.split('\t');
    const status = parts[0]?.trim();
    const file   = parts[1]?.trim() || parts[parts.length - 1]?.trim();
    if (!file) continue;
    if (status === 'A') added.push(file);
    else if (status === 'D') deleted.push(file);
    else if (status?.startsWith('M') || status?.startsWith('R')) modified.push(file);
  }

  return { added, modified, deleted };
}

function parseShortStat(shortRaw) {
  const s = String(shortRaw || '');
  const files    = (s.match(/(\d+) file/)     || [, '0'])[1];
  const inserted = (s.match(/(\d+) insertion/) || [, '0'])[1];
  const deleted  = (s.match(/(\d+) deletion/)  || [, '0'])[1];
  return { files, inserted, deleted };
}

function getPackageChanges(cwd, fromHash, toHash) {
  try {
    const oldPkg = JSON.parse(runCmdSync(`git show ${fromHash}:package.json`, cwd) || '{}');
    const newPkg = JSON.parse(runCmdSync(`git show ${toHash}:package.json`, cwd) || '{}');

    const oldDeps = { ...(oldPkg.dependencies || {}), ...(oldPkg.devDependencies || {}) };
    const newDeps = { ...(newPkg.dependencies || {}), ...(newPkg.devDependencies || {}) };

    const added    = [];
    const removed  = [];
    const updated  = [];

    for (const [pkg, ver] of Object.entries(newDeps)) {
      if (!oldDeps[pkg]) added.push(`${pkg}@${ver}`);
      else if (oldDeps[pkg] !== ver) updated.push(`${pkg}: ${oldDeps[pkg]} → ${ver}`);
    }
    for (const pkg of Object.keys(oldDeps)) {
      if (!newDeps[pkg]) removed.push(pkg);
    }

    return { added, removed, updated };
  } catch {
    return { added: [], removed: [], updated: [] };
  }
}

module.exports = {
  command: ['update', 'actualizar', 'upgrade'],
  description: 'Actualiza el bot desde el repositorio GitHub (solo owner)',
  categoria: 'owner',
  isOwner: true,

  run: async (client, m, args, from, isCreator, ctx = {}) => {
    const soloCheck = String(args[0] || '').toLowerCase() === 'check';
    const cwd       = process.cwd();

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const gitVersion = runCmdSync('git --version');
    if (!gitVersion.includes('git')) {
      return client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Update_
${BORDER_BOTTOM}

✗ Git no está disponible en el servidor.

➜ Instala git o actualiza manualmente.`
      }, { quoted: m });
    }

    const hasGit = fs.existsSync(path.join(cwd, '.git'));

    if (soloCheck) {
      await client.sendMessage(from, {
        text: `⏳ Verificando actualizaciones...`
      }, { quoted: m });

      try {
        let localHash   = '???';
        let remoteHash  = '???';
        let needsUpdate = false;
        let diffInfo    = '';

        if (hasGit) {
          localHash  = runCmdSync('git rev-parse --short HEAD', cwd);
          await runCmd(`git fetch origin ${REPO_BRANCH} --quiet`, cwd);
          remoteHash  = runCmdSync(`git rev-parse --short origin/${REPO_BRANCH}`, cwd);
          needsUpdate = localHash !== remoteHash;

          if (needsUpdate) {
            const { nameStatus, shortRaw, commitLog } = getDiffStats(cwd, localHash, `origin/${REPO_BRANCH}`);
            const { files, inserted, deleted } = parseShortStat(shortRaw);
            const { added, modified, deleted: del } = parseFileChanges(nameStatus);
            const commits = String(commitLog || '').split('\n').filter(Boolean);

            const previewFiles = [
              ...added.slice(0, 3).map(f => `  ➜ ${f}`),
              ...modified.slice(0, 3).map(f => `  ➜ ${f}`),
              ...del.slice(0, 2).map(f => `  ➜ ${f}`),
            ].join('\n') || '  (sin cambios)';

            const previewCommits = commits.slice(0, 3)
              .map(c => `  ➜ ${c}`)
              .join('\n') || '  (sin commits)';

            diffInfo =
`

➜ Archivos afectados: ${files}
➜ Líneas agregadas: +${inserted}
➜ Líneas eliminadas: -${deleted}

Archivos que cambiarían:
${previewFiles}

Commits nuevos:
${previewCommits}`;
          }
        } else {
          needsUpdate = true;
          localHash   = 'sin_git';
          remoteHash  = 'GitHub';
        }

        return client.sendMessage(from, {
          text:
`${BORDER_TOP}
       _Update Check_
${BORDER_BOTTOM}

${needsUpdate ? '➜ Hay una actualización disponible' : '✓ El bot está actualizado'}

➜ Local: ${localHash}
➜ GitHub: ${remoteHash}
➜ Rama: ${REPO_BRANCH}
${diffInfo}

${needsUpdate ? '➜ Usa .update para aplicar la actualización.' : '➜ No hay nada nuevo.'}`
        }, { quoted: m });

      } catch (e) {
        return client.sendMessage(from, {
          text: `✗ Error al verificar: ${String(e?.message || e).slice(0, 100)}`
        }, { quoted: m });
      }
    }

    await client.sendMessage(from, {
      text:
`${BORDER_TOP}
       _Actualizando Bot_
${BORDER_BOTTOM}

➜ Descargando última versión...
➜ Rama: ${REPO_BRANCH}

_Por favor espera._`
    }, { quoted: m });

    try {
      let updateLog = [];
      let diffStats = null;
      let pkgChanges = null;

      if (hasGit) {
        updateLog.push('Repositorio git encontrado.');

        const hashAntes = runCmdSync('git rev-parse HEAD', cwd);

        const backupDir = path.join(cwd, '__update_backup__');
        const backedUpSettings = backupFile(path.join(cwd, 'settings.json'), backupDir);
        if (backedUpSettings) updateLog.push('settings.json respaldado.');

        try {
          await runCmd(`git fetch origin ${REPO_BRANCH} --quiet`, cwd);
          updateLog.push('Repositorio remoto descargado.');

          const hashRemoto = runCmdSync(`git rev-parse origin/${REPO_BRANCH}`, cwd);
          diffStats  = getDiffStats(cwd, hashAntes, hashRemoto);
          pkgChanges = getPackageChanges(cwd, hashAntes, hashRemoto);

          await runCmd(`git reset --hard origin/${REPO_BRANCH}`, cwd);
          updateLog.push('Código sincronizado.');
        } catch (e) {
          updateLog.push(`Git sync: ${String(e?.message || '').slice(0, 60)}`);
        }

        if (backedUpSettings) {
          restoreFile('settings.json', backupDir, cwd);
          updateLog.push('settings.json restaurado.');
        }

        try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch {}

      } else {
        updateLog.push('Clonando repositorio...');
        const tmpDir = path.join(cwd, '__update_tmp__');
        try { execSync(`rm -rf "${tmpDir}"`); } catch {}

        await runCmd(`git clone --depth=1 --branch ${REPO_BRANCH} ${REPO_URL} "${tmpDir}"`, cwd);
        updateLog.push('Clon descargado.');

        const entries = fs.readdirSync(tmpDir);
        let copied = 0;
        for (const entry of entries) {
          if (entry === '.git') continue;
          if (PROTECTED.some(p => entry === p || entry.startsWith(p))) continue;
          try {
            execSync(`cp -r "${path.join(tmpDir, entry)}" "${path.join(cwd, entry)}"`);
            copied++;
          } catch {}
        }
        try { execSync(`rm -rf "${tmpDir}"`); } catch {}
        updateLog.push(`${copied} archivos copiados.`);
      }

      let npmOut = '';
      try {
        await client.sendMessage(from, {
          text: 'Instalando dependencias...'
        }, { quoted: m });

        npmOut = await runCmd('npm install --omit=dev 2>&1', cwd);
        updateLog.push('Dependencias instaladas.');
      } catch (e) {
        updateLog.push(`npm install: ${String(e?.message || '').slice(0, 60)}`);
      }

      let newHash = '???';
      try {
        if (fs.existsSync(path.join(cwd, '.git'))) {
          newHash = runCmdSync('git rev-parse --short HEAD', cwd);
        }
      } catch {}

      let resumenCambios = '';

      if (diffStats) {
        const { shortRaw, nameStatus, commitLog } = diffStats;
        const { files, inserted, deleted } = parseShortStat(shortRaw);
        const { added, modified, deleted: del } = parseFileChanges(nameStatus);
        const commits = String(commitLog || '').split('\n').filter(Boolean);

        const listaArchivos = [
          ...added.slice(0, 3).map(f    => `  ➜ ${f}`),
          ...modified.slice(0, 3).map(f => `  ➜ ${f}`),
          ...del.slice(0, 2).map(f      => `  ➜ ${f}`),
        ].join('\n');

        const listaCommits = commits.slice(0, 5)
          .map(c => `  ➜ ${c}`)
          .join('\n');

        resumenCambios += `

➜ Archivos cambiados: ${files}
➜ Líneas agregadas: +${inserted}
➜ Líneas eliminadas: -${deleted}`;

        if (listaArchivos) {
          resumenCambios += `

Archivos modificados:
${listaArchivos}`;
        }

        if (listaCommits) {
          resumenCambios += `

Commits aplicados:
${listaCommits}`;
        }
      }

      if (pkgChanges) {
        const { added: pkgAdd, removed: pkgRem, updated: pkgUpd } = pkgChanges;
        if (pkgAdd.length || pkgRem.length || pkgUpd.length) {
          resumenCambios += '\n\nCambios en dependencias:';
          pkgAdd.slice(0, 4).forEach(p => { resumenCambios += `\n  ➜ ${p}`; });
          pkgUpd.slice(0, 4).forEach(p => { resumenCambios += `\n  ➜ ${p}`; });
          pkgRem.slice(0, 4).forEach(p => { resumenCambios += `\n  ➜ ${p}`; });
        }
      }

      const logText = updateLog.map(l => `➜ ${l}`).join('\n');

      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Actualización Completa_
${BORDER_BOTTOM}

✓ Bot actualizado exitosamente

${logText}

➜ Versión: ${newHash}
${resumenCambios || '\n➜ Sin cambios detectados.'}

${BORDER_TOP}
       _Reiniciando..._
${BORDER_BOTTOM}`
      }, { quoted: m });

      setTimeout(() => process.exit(0), 5000);

    } catch (e) {
      await client.sendMessage(from, {
        text:
`${BORDER_TOP}
       _Error en Update_
${BORDER_BOTTOM}

✗ Falló la actualización

${String(e?.message || e).slice(0, 200)}

➜ Posibles causas:
  ➜ Sin conexión a GitHub
  ➜ Repositorio privado
  ➜ Sin permisos de escritura

${BORDER_TOP}
${BORDER_BOTTOM}`
      }, { quoted: m });
    }
  },
};