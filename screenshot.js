const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 20000 });
  await sleep(3000);
  await page.screenshot({ path: '/tmp/shot-home.png' });
  console.log('home');

  const clickText = async (text) => {
    await page.evaluate((t) => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.children.length === 0 && el.textContent.trim() === t) {
          el.click(); return true;
        }
      }
    }, text);
    await sleep(2500);
  };

  await clickText('CRM');
  await page.screenshot({ path: '/tmp/shot-crm-dashboard.png' });
  console.log('crm-dashboard');

  await clickText('Leads');
  await sleep(1000);
  await page.screenshot({ path: '/tmp/shot-crm-leads.png' });
  console.log('crm-leads');

  // Click first lead row to open drawer
  await page.evaluate(() => {
    const rows = document.querySelectorAll('[style*="cursor: pointer"]');
    for (const r of rows) {
      if (r.children.length > 2) { r.click(); break; }
    }
  });
  await sleep(1500);
  await page.screenshot({ path: '/tmp/shot-crm-drawer.png' });
  console.log('crm-drawer');

  // Close drawer by pressing Escape
  await page.keyboard.press('Escape');
  await sleep(500);

  await clickText('Campaigns');
  await page.screenshot({ path: '/tmp/shot-crm-campaigns.png' });
  console.log('crm-campaigns');

  await clickText('Reports');
  await page.screenshot({ path: '/tmp/shot-crm-reports.png' });
  console.log('crm-reports');

  await browser.close();
  console.log('DONE');
})();
