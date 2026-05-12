/**
 * Script de capture des screenshots pour l'Investor Deck
 * Usage: node scripts/capture-screenshots.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const EMAIL = 'admin@demo-sa.demo';
const PASS  = 'Demo1234!';

async function shot(page, name, url, waitMs = 1200) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(waitMs);
  // hide AI widget if present
  await page.evaluate(() => {
    const el = document.querySelector('[data-ai-widget]');
    if (el) el.style.display = 'none';
  }).catch(() => {});
  const path = join(OUT, `${name}.jpg`);
  await page.screenshot({
    path,
    type: 'jpeg',
    quality: 82,
    fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 810 }
  });
  console.log(`✓ ${name}.jpg`);
  return path;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 1
  });
  const page = await ctx.newPage();

  // ── Login ─────────────────────────────────────────────────────────────────
  console.log('🔐 Login...');
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('After login URL:', url);
  if (url.includes('/auth/')) {
    // Try again
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('After 2nd attempt:', page.url());
  }
  console.log('✓ Logged in, navigating to app...');

  // ── Captures ──────────────────────────────────────────────────────────────
  const pages = [
    // Dashboard
    ['01_dashboard',                `${BASE}/app/dashboard`],
    // Gestion
    ['02_gestion_commandes',        `${BASE}/app/gestion/ventes`],
    ['03_gestion_factures_ventes',  `${BASE}/app/gestion/ventes`, 800],
    ['04_gestion_factures_achats',  `${BASE}/app/gestion/achats`],
    ['05_gestion_clients',          `${BASE}/app/gestion/clients`],
    ['06_gestion_fournisseurs',     `${BASE}/app/gestion/fournisseurs`],
    ['07_gestion_stock',            `${BASE}/app/gestion/stock`],
    ['08_gestion_tresorerie',       `${BASE}/app/gestion/tresorerie`],
    ['09_gestion_bons_livraison',   `${BASE}/app/gestion/bons-livraison`],
    // Comptabilite
    ['10_compta_journal',           `${BASE}/app/comptabilite/journal`],
    ['11_compta_balance',           `${BASE}/app/comptabilite/balance`],
    ['12_compta_grand_livre',       `${BASE}/app/comptabilite/grand-livre`],
    ['13_compta_etats_financiers',  `${BASE}/app/comptabilite/etats-financiers`],
    ['14_compta_revision',          `${BASE}/app/comptabilite/revision`],
    ['15_compta_immobilisations',   `${BASE}/app/comptabilite/immobilisations`],
    // RH
    ['16_rh_employes',              `${BASE}/app/rh/employes`],
    ['17_rh_contrats',              `${BASE}/app/rh/contrats`],
    ['18_rh_conges',                `${BASE}/app/rh/conges`],
    ['19_rh_paie',                  `${BASE}/app/rh/paie`],
    ['20_rh_planning',              `${BASE}/app/rh/planning`],
    // Juridique
    ['21_juridique_contrats',       `${BASE}/app/juridique/contrats`],
    ['22_juridique_conformite',     `${BASE}/app/juridique/conformite`],
    // ESG
    ['23_esg_dashboard',            `${BASE}/app/esg/environnement`],
    ['24_esg_social',               `${BASE}/app/esg/social`],
    ['25_esg_gouvernance',          `${BASE}/app/esg/gouvernance`],
    // Fiscalite
    ['26_fiscal_tva',               `${BASE}/app/fiscal/tva`],
    ['27_fiscal_is',                `${BASE}/app/fiscal/is`],
    // Settings
    ['28_settings_localisation',    `${BASE}/app/settings/localisation`],
    // Login screen (logout first)
    ['29_auth_register',            `${BASE}/auth/register`],
  ];

  for (const [name, url, wait] of pages) {
    try {
      await shot(page, name, url, wait ?? 1200);
    } catch (e) {
      console.error(`✗ ${name}: ${e.message}`);
    }
  }

  // ── Factures ventes tab ────────────────────────────────────────────────────
  try {
    await page.goto(`${BASE}/app/gestion/ventes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // Click "Factures ventes" tab
    const tabs = page.locator('text=Factures ventes');
    if (await tabs.count() > 0) {
      await tabs.first().click();
      await page.waitForTimeout(1000);
      const path = join(OUT, '03_gestion_factures_ventes.jpg');
      await page.screenshot({ path, type: 'jpeg', quality: 82, fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 810 } });
      console.log('✓ 03_gestion_factures_ventes.jpg (tab)');
    }
  } catch(e) { console.error('factures tab:', e.message); }

  await browser.close();
  console.log('\n🎉 All screenshots saved to public/screenshots/');
})();
