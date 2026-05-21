"""
Athenis — Flyer marketing A4 (1 page)
Palette EXACTE de l'application (tailwind.config.ts) :
  forest-900 #1b4332 / forest-700 #1a5240 / forest-500 #2e8063 / forest-50 #f0f7f4
Accent : amber-500 #f59e0b (utilise comme dans l'app, parcimonieusement)

Sortie : marketing/athenis-flyer.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, Color
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ────────────────────────────────────────────────────────────────────────
# FONTS — Bricolage Grotesque + Geist Mono depuis le skill canvas-design
# ────────────────────────────────────────────────────────────────────────
SKILL = Path(r"C:\Users\admin\AppData\Roaming\Claude\local-agent-mode-sessions"
             r"\skills-plugin\d4210feb-93bb-4ae1-a7f3-5334b73dfff1"
             r"\3ba22595-8fcd-4be5-8705-42ba8b5e7d1b\skills\canvas-design"
             r"\canvas-fonts")
FONT_FALLBACK_REG = "Helvetica"
FONT_FALLBACK_BOLD = "Helvetica-Bold"
FONT_FALLBACK_MONO = "Courier"
FONT_FALLBACK_MONO_BOLD = "Courier-Bold"

def _try_register(name, *candidates):
    for c in candidates:
        p = SKILL / c
        if p.exists():
            try:
                pdfmetrics.registerFont(TTFont(name, str(p)))
                return name
            except Exception:
                pass
    return None

REG = _try_register("Bricolage",
                    "BricolageGrotesque-Regular.ttf",
                    "Bricolage_Grotesque/static/BricolageGrotesque-Regular.ttf") or FONT_FALLBACK_REG
BOLD = _try_register("Bricolage-Bold",
                     "BricolageGrotesque-Bold.ttf",
                     "Bricolage_Grotesque/static/BricolageGrotesque-Bold.ttf") or FONT_FALLBACK_BOLD
SEMI = _try_register("Bricolage-Semi",
                     "BricolageGrotesque-SemiBold.ttf",
                     "Bricolage_Grotesque/static/BricolageGrotesque-SemiBold.ttf") or BOLD
MONO = _try_register("Geist-Mono",
                     "GeistMono-Regular.ttf",
                     "Geist_Mono/static/GeistMono-Regular.ttf") or FONT_FALLBACK_MONO
MONO_BOLD = _try_register("Geist-Mono-Bold",
                          "GeistMono-Bold.ttf",
                          "Geist_Mono/static/GeistMono-Bold.ttf") or FONT_FALLBACK_MONO_BOLD

# ────────────────────────────────────────────────────────────────────────
# PALETTE EXACTE DE L'APP (tailwind.config.ts)
# ────────────────────────────────────────────────────────────────────────
FOREST_950 = HexColor("#0d2219")
FOREST_900 = HexColor("#1b4332")   # primary brand (bg-forest-900)
FOREST_800 = HexColor("#173f31")
FOREST_700 = HexColor("#1a5240")   # accents, hover
FOREST_500 = HexColor("#2e8063")   # active indicators
FOREST_300 = HexColor("#7dbfa4")
FOREST_100 = HexColor("#d9ece3")
FOREST_50  = HexColor("#f0f7f4")   # lightest bg

AMBER_500  = HexColor("#f59e0b")   # rare accent
AMBER_100  = HexColor("#fef3c7")

GRAY_900   = HexColor("#111827")
GRAY_700   = HexColor("#374151")
GRAY_500   = HexColor("#6b7280")
GRAY_300   = HexColor("#d1d5db")
GRAY_200   = HexColor("#e5e7eb")
GRAY_100   = HexColor("#f3f4f6")
GRAY_50    = HexColor("#f9fafb")
WHITE_BG   = HexColor("#ffffff")

# ────────────────────────────────────────────────────────────────────────
# CANVAS — A4 PORTRAIT, 1 PAGE
# ────────────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 14 * mm

OUTPUT = Path(__file__).parent / "athenis-flyer.pdf"
c = canvas.Canvas(str(OUTPUT), pagesize=A4)
c.setTitle("Athenis — Gestion 360° pour PME")
c.setAuthor("Athenis")
c.setSubject("Flyer marketing")

# ════════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════════
def fill(color):
    c.setFillColor(color)

def stroke(color, width=0.5):
    c.setStrokeColor(color)
    c.setLineWidth(width)

def text(x, y, s, font, size, color=GRAY_900):
    c.setFont(font, size)
    fill(color)
    c.drawString(x, y, s)

def text_centered(x, y, s, font, size, color=GRAY_900):
    c.setFont(font, size)
    fill(color)
    c.drawCentredString(x, y, s)

def text_right(x, y, s, font, size, color=GRAY_900):
    c.setFont(font, size)
    fill(color)
    c.drawRightString(x, y, s)

def rect(x, y, w, h, fill_color=None, stroke_color=None, stroke_w=0.5, r=0):
    if fill_color:
        fill(fill_color)
    if stroke_color:
        stroke(stroke_color, stroke_w)
    if r > 0:
        c.roundRect(x, y, w, h, r, stroke=1 if stroke_color else 0, fill=1 if fill_color else 0)
    else:
        c.rect(x, y, w, h, stroke=1 if stroke_color else 0, fill=1 if fill_color else 0)

# ════════════════════════════════════════════════════════════════════════
# ICONS — minimalistes, traits fins, palette forest
# ════════════════════════════════════════════════════════════════════════
def icon_doc(cx, cy, s=4*mm, col=FOREST_700):
    """Document avec barres (facture/gestion)"""
    w, h = s, s*1.25
    rect(cx-w/2, cy-h/2, w, h, stroke_color=col, stroke_w=0.7, r=0.4)
    stroke(col, 0.5)
    for i, frac in enumerate([0.3, 0.5, 0.7]):
        y = cy + h/2 - h*frac
        c.line(cx-w/2 + 0.6*mm, y, cx+w/2 - 0.6*mm, y)

def icon_book(cx, cy, s=4*mm, col=FOREST_700):
    """Livre comptable"""
    w, h = s*1.1, s*0.95
    rect(cx-w/2, cy-h/2, w, h, stroke_color=col, stroke_w=0.7, r=0.3)
    stroke(col, 0.5)
    c.line(cx, cy-h/2, cx, cy+h/2)
    for frac in [0.35, 0.65]:
        y = cy + h/2 - h*frac
        c.line(cx-w/2 + 0.5*mm, y, cx-0.4*mm, y)
        c.line(cx+0.4*mm, y, cx+w/2 - 0.5*mm, y)

def icon_people(cx, cy, s=4*mm, col=FOREST_700):
    """Deux personnes (RH)"""
    r = s*0.18
    stroke(col, 0.7); fill(col)
    # tête 1
    c.circle(cx-s*0.3, cy+s*0.25, r, stroke=0, fill=1)
    # tête 2
    c.circle(cx+s*0.3, cy+s*0.25, r, stroke=0, fill=1)
    # corps 1
    c.arc(cx-s*0.65, cy-s*0.5, cx+s*0.05, cy+s*0.1, 0, 180)
    # corps 2
    c.arc(cx-s*0.05, cy-s*0.5, cx+s*0.65, cy+s*0.1, 0, 180)

def icon_gavel(cx, cy, s=4*mm, col=FOREST_700):
    """Marteau de justice (juridique)"""
    stroke(col, 0.9)
    # manche
    c.line(cx-s*0.5, cy-s*0.4, cx+s*0.2, cy+s*0.3)
    # tête
    c.line(cx-s*0.1, cy+s*0.6, cx+s*0.5, cy+s*0.2)
    fill(col)
    c.rect(cx-s*0.1-1, cy+s*0.6-1, 8, 8, stroke=0, fill=0)  # placeholder
    # socle (base)
    c.line(cx-s*0.6, cy-s*0.55, cx+s*0.1, cy-s*0.55)

def icon_leaf(cx, cy, s=4*mm, col=FOREST_700):
    """Feuille (ESG)"""
    stroke(col, 0.8); fill(col)
    # forme amande
    p = c.beginPath()
    p.moveTo(cx-s*0.45, cy-s*0.4)
    p.curveTo(cx-s*0.6, cy+s*0.2, cx-s*0.1, cy+s*0.6, cx+s*0.5, cy+s*0.5)
    p.curveTo(cx+s*0.4, cy-s*0.1, cx+s*0.1, cy-s*0.45, cx-s*0.45, cy-s*0.4)
    c.drawPath(p, stroke=1, fill=0)
    # nervure
    c.line(cx-s*0.45, cy-s*0.4, cx+s*0.5, cy+s*0.5)

def icon_pillar(cx, cy, s=4*mm, col=FOREST_700):
    """Capitole / fiscalité"""
    stroke(col, 0.7)
    # toit
    c.line(cx-s*0.6, cy+s*0.45, cx+s*0.6, cy+s*0.45)
    c.line(cx-s*0.55, cy+s*0.55, cx+s*0.55, cy+s*0.55)
    # piliers
    for dx in [-s*0.4, -s*0.13, s*0.13, s*0.4]:
        c.line(cx+dx, cy-s*0.35, cx+dx, cy+s*0.4)
    # base
    c.line(cx-s*0.6, cy-s*0.45, cx+s*0.6, cy-s*0.45)
    c.line(cx-s*0.55, cy-s*0.35, cx+s*0.55, cy-s*0.35)

def icon_shield(cx, cy, s=4*mm, col=FOREST_700):
    """Bouclier (sécurité)"""
    stroke(col, 0.8); fill(col)
    p = c.beginPath()
    p.moveTo(cx, cy+s*0.55)
    p.lineTo(cx+s*0.5, cy+s*0.25)
    p.lineTo(cx+s*0.5, cy-s*0.2)
    p.curveTo(cx+s*0.5, cy-s*0.55, cx, cy-s*0.65, cx, cy-s*0.65)
    p.curveTo(cx, cy-s*0.65, cx-s*0.5, cy-s*0.55, cx-s*0.5, cy-s*0.2)
    p.lineTo(cx-s*0.5, cy+s*0.25)
    p.close()
    c.drawPath(p, stroke=1, fill=0)
    # check à l'intérieur
    stroke(col, 0.9)
    c.line(cx-s*0.2, cy, cx-s*0.05, cy-s*0.15)
    c.line(cx-s*0.05, cy-s*0.15, cx+s*0.25, cy+s*0.2)

def icon_globe(cx, cy, s=4*mm, col=FOREST_700):
    """Globe (multi-devises)"""
    stroke(col, 0.7)
    c.circle(cx, cy, s*0.5, stroke=1, fill=0)
    c.line(cx-s*0.5, cy, cx+s*0.5, cy)
    c.line(cx, cy-s*0.5, cx, cy+s*0.5)
    # méridiens ellipses
    p = c.beginPath()
    p.moveTo(cx, cy-s*0.5)
    p.curveTo(cx-s*0.25, cy-s*0.25, cx-s*0.25, cy+s*0.25, cx, cy+s*0.5)
    c.drawPath(p, stroke=1, fill=0)
    p = c.beginPath()
    p.moveTo(cx, cy-s*0.5)
    p.curveTo(cx+s*0.25, cy-s*0.25, cx+s*0.25, cy+s*0.25, cx, cy+s*0.5)
    c.drawPath(p, stroke=1, fill=0)

def icon_devices(cx, cy, s=4*mm, col=FOREST_700):
    """Desktop + mobile (multi-plateforme)"""
    stroke(col, 0.7)
    # écran
    rect(cx-s*0.55, cy-s*0.1, s*0.85, s*0.55, stroke_color=col, stroke_w=0.7, r=0.3)
    # pied
    c.line(cx-s*0.3, cy-s*0.25, cx+s*0.15, cy-s*0.25)
    c.line(cx-s*0.1, cy-s*0.1, cx-s*0.1, cy-s*0.25)
    # mobile
    rect(cx+s*0.35, cy-s*0.35, s*0.3, s*0.7, stroke_color=col, stroke_w=0.7, r=0.6)

# ════════════════════════════════════════════════════════════════════════
# PAGE UNIQUE — A4 portrait
# ════════════════════════════════════════════════════════════════════════
# Fond
rect(0, 0, PAGE_W, PAGE_H, fill_color=WHITE_BG)

# ─── Header : bandeau forest-900 fin avec logo ─────────────────────────
HDR_H = 22 * mm
rect(0, PAGE_H - HDR_H, PAGE_W, HDR_H, fill_color=FOREST_900)

# Logo : carré A
logo_size = 11 * mm
logo_x = MARGIN
logo_y = PAGE_H - HDR_H/2 - logo_size/2
rect(logo_x, logo_y, logo_size, logo_size, fill_color=WHITE_BG, r=2)
text_centered(logo_x + logo_size/2, logo_y + logo_size/2 - 2.5*mm,
              "A", BOLD, 16, FOREST_900)

# Nom + tagline
text(logo_x + logo_size + 4*mm, PAGE_H - HDR_H/2 + 0.5*mm,
     "athenis", BOLD, 18, WHITE_BG)
text(logo_x + logo_size + 4*mm, PAGE_H - HDR_H/2 - 4*mm,
     "GESTION  360°", REG, 7, FOREST_300)
c.setFont(REG, 7)
fill(FOREST_300)
# letter-spacing emulé : redraw avec espaces
# (déjà fait via espaces visibles dans le texte)

# URL alignée à droite
text_right(PAGE_W - MARGIN, PAGE_H - HDR_H/2 + 1.5*mm,
           "athenis360.com", SEMI, 10, WHITE_BG)
text_right(PAGE_W - MARGIN, PAGE_H - HDR_H/2 - 3*mm,
           "Conçu au Cameroun · Conforme partout", REG, 7, FOREST_300)

# ─── HERO ────────────────────────────────────────────────────────────────
HERO_Y = PAGE_H - HDR_H - 12*mm

# Eyebrow
text(MARGIN, HERO_Y, "SAAS DE GESTION 360° · OHADA & PCG FRANCE",
     SEMI, 7, FOREST_700)

# Titre principal — 2 lignes
title_y1 = HERO_Y - 11*mm
title_y2 = title_y1 - 9.5*mm
c.setFont(BOLD, 26)
fill(GRAY_900)
c.drawString(MARGIN, title_y1, "La gestion 360° de votre PME,")
c.setFont(BOLD, 26)
fill(FOREST_700)
c.drawString(MARGIN, title_y2, "enfin simple.")

# Sous-titre
sub_y = title_y2 - 8*mm
text(MARGIN, sub_y,
     "Comptabilité · Facturation · Paie · RH · Juridique · ESG · Fiscalité",
     REG, 10, GRAY_700)
text(MARGIN, sub_y - 4.5*mm,
     "Tout-en-un, en français — pour PME d'Afrique francophone et de France.",
     REG, 10, GRAY_500)

# ─── 4 BÉNÉFICES — bandeau horizontal ───────────────────────────────────
BEN_Y = sub_y - 13*mm
BEN_H = 18*mm
ben_width = (PAGE_W - 2*MARGIN) / 4

benefits = [
    (icon_shield, "Conforme", "SYSCOHADA · PCG France"),
    (icon_globe,  "Multi-devises", "F CFA · EUR · USD natifs"),
    (icon_doc,    "Bank-grade", "Hébergement EU · MFA"),
    (icon_devices,"Multi-plateforme", "Web · Windows · Mobile"),
]
for i, (icon_fn, title_, sub_) in enumerate(benefits):
    bx = MARGIN + i * ben_width
    by = BEN_Y - BEN_H
    icon_fn(bx + 5*mm, by + BEN_H - 7*mm, s=5*mm, col=FOREST_700)
    text(bx + 12*mm, by + BEN_H - 6*mm, title_, BOLD, 9, GRAY_900)
    text(bx + 12*mm, by + BEN_H - 10*mm, sub_, REG, 7.5, GRAY_500)

# Hairline séparateur sous bénéfices
stroke(GRAY_200, 0.5)
c.line(MARGIN, BEN_Y - BEN_H - 3*mm, PAGE_W - MARGIN, BEN_Y - BEN_H - 3*mm)

# ─── 6 MODULES — grille 3×2 compacte ────────────────────────────────────
MOD_TITLE_Y = BEN_Y - BEN_H - 9*mm
text(MARGIN, MOD_TITLE_Y, "6 modules pour tout gérer",
     BOLD, 13, GRAY_900)
text(MARGIN, MOD_TITLE_Y - 4.5*mm,
     "Une seule application. Une seule base de données. Toutes les obligations couvertes.",
     REG, 8.5, GRAY_500)

MOD_Y = MOD_TITLE_Y - 11*mm
MOD_W = (PAGE_W - 2*MARGIN - 4*mm) / 3
MOD_H = 26*mm

modules = [
    (icon_doc,    "Gestion",       "Devis, factures,",         "clients, stocks, trésorerie"),
    (icon_book,   "Comptabilité",  "Journal, balance,",        "états financiers OHADA & PCG"),
    (icon_people, "RH & Paie",     "Bulletins CNPS / URSSAF,", "congés, contrats, organigramme"),
    (icon_gavel,  "Juridique",     "Contrats, signature",      "électronique OHADA, RGPD"),
    (icon_leaf,   "ESG / CSRD",    "Bilan carbone, rapports",  "DPEF, gouvernance, social"),
    (icon_pillar, "Fiscalité",     "TVA, IS, IRPP, DSF —",     "calculs automatisés par zone"),
]
for i, (icon_fn, title_, desc1, desc2) in enumerate(modules):
    col = i % 3
    row = i // 3
    mx = MARGIN + col * (MOD_W + 2*mm)
    my = MOD_Y - row * (MOD_H + 2*mm) - MOD_H
    # carte
    rect(mx, my, MOD_W, MOD_H,
         fill_color=FOREST_50, stroke_color=FOREST_100, stroke_w=0.5, r=2)
    # icon en haut à gauche
    icon_fn(mx + 6*mm, my + MOD_H - 7*mm, s=5*mm, col=FOREST_700)
    # numéro discret en haut à droite
    text_right(mx + MOD_W - 4*mm, my + MOD_H - 5*mm,
               f"0{i+1}", MONO, 7, FOREST_300)
    # titre
    text(mx + 4*mm, my + MOD_H - 14*mm, title_, BOLD, 11, FOREST_900)
    # description
    text(mx + 4*mm, my + MOD_H - 18.5*mm, desc1, REG, 7.5, GRAY_700)
    text(mx + 4*mm, my + MOD_H - 22*mm, desc2, REG, 7.5, GRAY_700)

# ─── TARIFS — bandeau horizontal compact ────────────────────────────────
PR_TITLE_Y = MOD_Y - 2*MOD_H - 8*mm
text(MARGIN, PR_TITLE_Y, "Tarifs adaptés au pouvoir d'achat local",
     BOLD, 11, GRAY_900)
text_right(PAGE_W - MARGIN, PR_TITLE_Y,
           "F CFA / mois  ·  ou EUR équivalent", REG, 7.5, GRAY_500)

PR_Y = PR_TITLE_Y - 5*mm
PR_W = (PAGE_W - 2*MARGIN - 3*mm) / 4
PR_H = 22*mm

plans = [
    ("Gratuit",  "0",      "0",   "F CFA", "€",  None,  False),
    ("Starter",  "5 900",  "9",   "F CFA", "€",  None,  False),
    ("Pro",      "19 000", "29",  "F CFA", "€",  "★",   True),   # mis en avant
    ("Premium",  "49 000", "79",  "F CFA", "€",  None,  False),
]
for i, (name, price_fcfa, price_eur, cur1, cur2, badge, highlight) in enumerate(plans):
    px = MARGIN + i * (PR_W + 1*mm)
    py = PR_Y - PR_H
    if highlight:
        rect(px, py, PR_W, PR_H,
             fill_color=FOREST_900, stroke_color=FOREST_900, stroke_w=0.5, r=2)
        title_col = WHITE_BG
        price_col = WHITE_BG
        cur_col   = FOREST_300
        eur_col   = FOREST_300
    else:
        rect(px, py, PR_W, PR_H,
             fill_color=WHITE_BG, stroke_color=GRAY_200, stroke_w=0.5, r=2)
        title_col = FOREST_900
        price_col = GRAY_900
        cur_col   = GRAY_500
        eur_col   = GRAY_500

    text(px + 4*mm, py + PR_H - 5.5*mm, name.upper(), SEMI, 8, title_col)
    if badge:
        # pastille amber
        rect(px + PR_W - 8*mm, py + PR_H - 6.5*mm, 4.5*mm, 4.5*mm,
             fill_color=AMBER_500, r=1)
        text_centered(px + PR_W - 5.75*mm, py + PR_H - 5.5*mm,
                      badge, BOLD, 6, FOREST_900)

    # prix F CFA en gros (mono)
    c.setFont(MONO_BOLD, 16)
    fill(price_col)
    c.drawString(px + 4*mm, py + PR_H - 13.5*mm, price_fcfa)
    c.setFont(REG, 6.5)
    fill(cur_col)
    c.drawString(px + 4*mm, py + PR_H - 16.5*mm, cur1 + " / mois")

    # équivalent EUR
    c.setFont(MONO, 8)
    fill(eur_col)
    c.drawString(px + 4*mm, py + PR_H - 20*mm, f"≈ {price_eur} {cur2}")

# Note "2 mois offerts en annuel"
text(MARGIN, PR_Y - PR_H - 4*mm,
     "2 mois offerts en paiement annuel · 14 jours d'essai sans CB",
     REG, 7.5, GRAY_500)

# ─── CTA bandeau bas + footer ───────────────────────────────────────────
CTA_Y = 28 * mm
CTA_H = 14 * mm

# Bandeau CTA forest-900
rect(MARGIN, CTA_Y, PAGE_W - 2*MARGIN, CTA_H,
     fill_color=FOREST_900, r=2)

# Texte CTA
text(MARGIN + 6*mm, CTA_Y + CTA_H - 5.5*mm,
     "Démarrez en 5 minutes",
     BOLD, 12, WHITE_BG)
text(MARGIN + 6*mm, CTA_Y + CTA_H - 10*mm,
     "14 jours d'essai gratuit — sans carte bancaire",
     REG, 8, FOREST_300)

# Bouton amber
btn_w = 52*mm
btn_h = 8*mm
btn_x = PAGE_W - MARGIN - 6*mm - btn_w
btn_y = CTA_Y + (CTA_H - btn_h)/2
rect(btn_x, btn_y, btn_w, btn_h, fill_color=AMBER_500, r=1.5)
text_centered(btn_x + btn_w/2, btn_y + btn_h/2 - 1.5*mm,
              "athenis360.com  →", BOLD, 10, FOREST_900)

# ─── Footer ─────────────────────────────────────────────────────────────
FOOT_Y = 14*mm

# Hairline
stroke(GRAY_200, 0.5)
c.line(MARGIN, FOOT_Y + 5*mm, PAGE_W - MARGIN, FOOT_Y + 5*mm)

text(MARGIN, FOOT_Y,
     "contact@athenis360.com",
     SEMI, 8, FOREST_700)
text_centered(PAGE_W/2, FOOT_Y,
              "Cameroun  ·  France  ·  Zone OHADA",
              REG, 8, GRAY_500)
text_right(PAGE_W - MARGIN, FOOT_Y,
           "athenis360.com",
           SEMI, 8, FOREST_700)

# Hairline sub
text_centered(PAGE_W/2, 7*mm,
              "© 2026 Athenis  ·  Conçu au Cameroun  ·  Hébergé en Europe (RGPD)",
              REG, 6.5, GRAY_500)

c.save()
print(f"OK - Flyer A4 1 page genere : {OUTPUT}")
