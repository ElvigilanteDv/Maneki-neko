const puppeteer = require('puppeteer');

module.exports = {
  command: ['report', 'reportar', 'spam'],
  description: 'Reporta un número usando Puppeteer (requiere sesión previa en ./user_data)',
  categoria: 'sistema',
  isOwner: true,

  run: async (sock, m, args, from, senderIsOwner) => {
    if (!args[0] || !args[1]) {
      return sock.sendMessage(from, {
        text: `❌ Error: Debes proporcionar el número y la cantidad.\n\nEjemplo: .report 5491122334455 10`
      }, { quoted: m });
    }

    const phone = args[0].replace(/\D/g, '');
    const amount = parseInt(args[1]);

    if (isNaN(amount) || amount <= 0) {
      return sock.sendMessage(from, { text: '❌ La cantidad debe ser un número entero positivo.' }, { quoted: m });
    }

    if (amount > 50) {
      return sock.sendMessage(from, { text: '⚠️ Por seguridad y rendimiento, el máximo de reportes por comando es 50.' }, { quoted: m });
    }

    const BORDER_TOP    = '╭⊱ ━━━━━━━━━━━━━━━ ⊰╮';
    const BORDER_BOTTOM = '╰⊱ ━━━━━━━━━━━━━━━ ⊰╯';

    const sent = await sock.sendMessage(
      from,
      { text: `${BORDER_TOP}\n   🚀 Iniciando reportes reales...\n${BORDER_BOTTOM}` },
      { quoted: m }
    );

    let browser;
    try {
      browser = await puppeteer.launch({
        userDataDir: './user_data',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

      await page.goto(`https://web.whatsapp.com/send?phone=${phone}`, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('[data-testid="chat-header"]', { timeout: 45000 });

      for (let i = 0; i < amount; i++) {
        // Abrir menú usando el header con data-testid
        await page.click('[data-testid="chat-header"]');
        await new Promise(r => setTimeout(r, 2000));

        // Buscar y hacer clic en "Reportar" usando diferentes selectores
        const reportClicked = await page.evaluate(() => {
          const items = document.querySelectorAll('div[role="menuitem"], div[role="button"]');
          for (const el of items) {
            const txt = el.innerText || '';
            if (txt.includes('Report') || txt.includes('Reportar')) {
              el.click();
              return true;
            }
          }
          return false;
        });

        if (!reportClicked) {
          // Intentar con selector alternativo
          const clicked = await page.evaluate(() => {
            const btn = document.querySelector('[aria-label*="Report" i], [aria-label*="Reportar" i]');
            if (btn) { btn.click(); return true; }
            return false;
          });
          if (!clicked) throw new Error('No se encontró el botón de Reportar.');
        }

        await new Promise(r => setTimeout(r, 2000));

        // Confirmar reporte
        const confirmClicked = await page.evaluate(() => {
          const btns = document.querySelectorAll('div[role="button"]');
          for (const btn of btns) {
            const txt = btn.innerText || '';
            if (txt.includes('Report') || txt.includes('Reportar')) {
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!confirmClicked) throw new Error('No se encontró el botón de confirmación.');

        await new Promise(r => setTimeout(r, 3000));

        if (i < amount - 1) {
          await page.reload({ waitUntil: 'networkidle2' });
          await page.waitForSelector('[data-testid="chat-header"]', { timeout: 30000 });
        }
      }

      await browser.close();

      const caption =
`${BORDER_TOP}
       _Reporte Exitoso_
${BORDER_BOTTOM}

➜ Número: ${phone}
➜ Cantidad: ${amount} reportes procesados

✓ Completado vía Puppeteer.

${BORDER_TOP}
${BORDER_BOTTOM}`;

      await sock.sendMessage(
        from,
        { text: caption, edit: sent.key },
        { quoted: m }
      ).catch(() => sock.sendMessage(from, { text: caption }, { quoted: m }));

    } catch (error) {
      console.error(error);
      if (browser) await browser.close();
      await sock.sendMessage(from, { text: `❌ Error de automatización: ${error.message}` }, { quoted: m });
    }
  },
};