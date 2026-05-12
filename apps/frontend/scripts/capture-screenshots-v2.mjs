/**
 * Capture avancée — Détails, formulaires, interactions
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/screenshots');
mkdirSync(OUT, { recursive: true });

const BASE  = 'http://localhost:5173';
const EMAIL = 'admin@demo-sa.demo';
const PASS  = 'Demo1234!';

async function shot(page, name, waitMs = 1000) {
  await page.waitForTimeout(waitMs);
  const path = join(OUT, `${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 85, fullPage: false,
    clip: { x: 0, y: 0, width: 1440, height: 810 } });
  console.log(`✓ ${name}.jpg`);
}

async function go(page, url, name, waitMs = 1400) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await shot(page, name, waitMs);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox']
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();

  // Login
  console.log('🔐 Login...');
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✓ Logged in:', page.url());

  // ── Dashboard général ─────────────────────────────────────────────────────
  await go(page, `${BASE}/app/dashboard`, '30_dashboard_full', 2000);

  // ── Gestion : Ouvrir une commande en détail ───────────────────────────────
  await page.goto(`${BASE}/app/gestion/ventes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Click first command row
  const rows = page.locator('table tbody tr, [role=row]').first();
  if (await rows.count() > 0) {
    await rows.click();
    await page.waitForTimeout(1200);
    await shot(page, '31_gestion_commande_detail');
  }

  // ── Gestion : Nouvelle facture (formulaire) ───────────────────────────────
  await page.goto(`${BASE}/app/gestion/ventes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const btnFact = page.locator('text=Factures ventes');
  if (await btnFact.count() > 0) { await btnFact.first().click(); await page.waitForTimeout(600); }
  const btnNew = page.locator('button:has-text("Nouvelle"), button:has-text("+ Nouvelle"), a:has-text("Nouvelle")').first();
  if (await btnNew.count() > 0) {
    await btnNew.click();
    await page.waitForTimeout(1500);
    await shot(page, '32_gestion_facture_form');
  }

  // ── Gestion : Clients détail ──────────────────────────────────────────────
  await page.goto(`${BASE}/app/gestion/clients`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const clientRow = page.locator('table tbody tr').first();
  if (await clientRow.count() > 0) {
    await clientRow.click();
    await page.waitForTimeout(1200);
    await shot(page, '33_gestion_client_fiche');
  }

  // ── Stock détail ──────────────────────────────────────────────────────────
  await go(page, `${BASE}/app/gestion/stock`, '34_gestion_stock_detail', 1500);

  // Click stock tab if needed
  const stockTab = page.locator('text=Articles, text=Stock, button:has-text("Stock")').first();
  if (await stockTab.count() > 0) { await stockTab.click(); await shot(page, '34b_gestion_articles_liste', 1000); }

  // ── Trésorerie dashboard ──────────────────────────────────────────────────
  await go(page, `${BASE}/app/gestion/tresorerie`, '35_tresorerie_dashboard', 1500);

  // ── Compta : Saisie écriture ──────────────────────────────────────────────
  await page.goto(`${BASE}/app/comptabilite/journal`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const btnEcr = page.locator('button:has-text("Nouvelle écriture"), button:has-text("Saisir"), button:has-text("+ Nouvelle")').first();
  if (await btnEcr.count() > 0) {
    await btnEcr.click();
    await page.waitForTimeout(1500);
    await shot(page, '36_compta_saisie_ecriture');
  } else {
    await shot(page, '36_compta_journal_liste', 500);
  }

  // ── Compta : Bilan ────────────────────────────────────────────────────────
  await go(page, `${BASE}/app/comptabilite/etats-financiers`, '37_compta_bilan', 2000);
  // Try clicking Bilan tab
  const bilanTab = page.locator('text=Bilan').first();
  if (await bilanTab.count() > 0) { await bilanTab.click(); await page.waitForTimeout(1000); await shot(page, '38_compta_bilan_detail'); }

  // ── Compta : Compte de résultat ───────────────────────────────────────────
  const crTab = page.locator('text=Résultat, text=Compte de résultat').first();
  if (await crTab.count() > 0) { await crTab.click(); await page.waitForTimeout(1000); await shot(page, '39_compta_compte_resultat'); }

  // ── RH : Fiche employé ────────────────────────────────────────────────────
  await page.goto(`${BASE}/app/rh/employes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const empRow = page.locator('table tbody tr, [role=row]').first();
  if (await empRow.count() > 0) {
    await empRow.click();
    await page.waitForTimeout(1500);
    await shot(page, '40_rh_employe_fiche');
  }

  // ── RH : Bulletin de paie ─────────────────────────────────────────────────
  await go(page, `${BASE}/app/rh/paie`, '41_rh_paie_liste', 1500);
  // Click first payslip
  const payRow = page.locator('table tbody tr').first();
  if (await payRow.count() > 0) {
    await payRow.click();
    await page.waitForTimeout(1500);
    await shot(page, '42_rh_bulletin_paie_detail');
  }

  // ── RH : Calendrier congés ────────────────────────────────────────────────
  await go(page, `${BASE}/app/rh/conges`, '43_rh_conges_calendrier', 1500);
  const calTab = page.locator('text=Calendrier').first();
  if (await calTab.count() > 0) { await calTab.click(); await page.waitForTimeout(1000); await shot(page, '44_rh_conges_calendar_view'); }

  // ── Juridique : Contrat detail ────────────────────────────────────────────
  await page.goto(`${BASE}/app/juridique/contrats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const contRow = page.locator('table tbody tr').first();
  if (await contRow.count() > 0) {
    await contRow.click();
    await page.waitForTimeout(1500);
    await shot(page, '45_juridique_contrat_detail');
  }

  // ── ESG : Score global ────────────────────────────────────────────────────
  await go(page, `${BASE}/app/esg/gouvernance`, '46_esg_gouvernance_score', 1500);
  await go(page, `${BASE}/app/esg/benchmark`,   '47_esg_benchmark', 1500);
  await go(page, `${BASE}/app/esg/action-plan`, '48_esg_plan_action', 1500);

  // ── Fiscalité : DSF ───────────────────────────────────────────────────────
  await go(page, `${BASE}/app/fiscal/dsf`,      '49_fiscal_dsf', 1800);
  await go(page, `${BASE}/app/fiscal/igs`,      '50_fiscal_igs', 1500);

  // ── Cabinet dashboard ─────────────────────────────────────────────────────
  await go(page, `${BASE}/cabinet/dashboard`,   '51_cabinet_dashboard', 1800);
  await go(page, `${BASE}/cabinet/clients`,     '52_cabinet_clients', 1500);

  // ── Finance personnelle ───────────────────────────────────────────────────
  await go(page, `${BASE}/personal/dashboard`,  '53_personal_dashboard', 1800);
  await go(page, `${BASE}/personal/expenses`,   '54_personal_depenses', 1500);
  await go(page, `${BASE}/personal/income`,     '55_personal_revenus',  1500);
  await go(page, `${BASE}/personal/savings`,    '56_personal_epargne',  1500);

  // ── Comptabilité : Révision détail ────────────────────────────────────────
  await go(page, `${BASE}/app/comptabilite/revision`, '57_compta_revision_detail', 2000);

  // ── Sécurité 2FA ─────────────────────────────────────────────────────────
  await go(page, `${BASE}/app/security`, '58_securite_2fa', 1500);

  // ── Accounting dashboard ──────────────────────────────────────────────────
  await go(page, `${BASE}/app/comptabilite`, '59_compta_dashboard', 2000);

  // ── RH : Organigramme ─────────────────────────────────────────────────────
  await go(page, `${BASE}/app/rh/organigramme`, '60_rh_organigramme', 1500);

  // ── ESG : CSRD ───────────────────────────────────────────────────────────
  await go(page, `${BASE}/app/esg/csrd`, '61_esg_csrd', 1500);

  // ── Facture detail ────────────────────────────────────────────────────────
  await page.goto(`${BASE}/app/gestion/ventes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const factTab2 = page.locator('text=Factures ventes').first();
  if (await factTab2.count() > 0) {
    await factTab2.click(); await page.waitForTimeout(800);
    const firstFact = page.locator('table tbody tr').first();
    if (await firstFact.count() > 0) {
      await firstFact.click(); await page.waitForTimeout(1500);
      await shot(page, '62_facture_detail_view');
    }
  }

  // ── Comptabilité grand livre detail ──────────────────────────────────────
  await go(page, `${BASE}/app/comptabilite/grand-livre`, '63_compta_grandlivre_detail', 2000);

  // ── Balance par exercice ─────────────────────────────────────────────────
  await go(page, `${BASE}/app/comptabilite/balance`, '64_compta_balance_detail', 2000);

  await browser.close();
  console.log('\n🎉 Done! Detailed screenshots saved to public/screenshots/');
})();
