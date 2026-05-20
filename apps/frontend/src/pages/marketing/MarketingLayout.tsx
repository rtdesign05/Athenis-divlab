import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'

// ── Header ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: '/fonctionnalites', label: 'Fonctionnalités' },
  { to: '/tarifs',          label: 'Tarifs' },
  { to: '/a-propos',        label: 'À propos' },
  { to: '/securite',        label: 'Sécurité' },
]

function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <header className={`sticky top-0 z-50 transition-all ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white border-b border-transparent'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-900 transition-transform group-hover:scale-105">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">Athenis</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-forest-700 leading-none">Gestion 360°</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? 'text-forest-700' : 'text-gray-600 hover:text-forest-700'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/auth/login" className="text-sm font-medium text-gray-700 hover:text-forest-700 transition-colors">
              Se connecter
            </Link>
            <Link
              to="/auth/register"
              className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-forest-800 hover:shadow"
            >
              Essayer gratuitement
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            aria-label="Menu"
          >
            <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-gray-100 pt-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm font-medium ${isActive ? 'bg-forest-50 text-forest-700' : 'text-gray-700 hover:bg-gray-50'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 mt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
              <Link to="/auth/login" className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700">
                Se connecter
              </Link>
              <Link to="/auth/register" className="rounded-lg bg-forest-900 px-3 py-2 text-center text-sm font-semibold text-white">
                Essayer
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

function MarketingFooter() {
  return (
    <footer className="bg-forest-950 text-gray-300 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">

          {/* Logo + tagline */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                <span className="text-lg font-bold text-forest-900">A</span>
              </div>
              <div>
                <p className="text-lg font-bold text-white leading-tight">Athenis</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-forest-300 leading-none">Gestion 360°</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Le logiciel SaaS de gestion comptable, RH, juridique et ESG conçu pour les PME
              d'Afrique francophone (SYSCOHADA) et de France (PCG).
            </p>
            <div className="mt-6 flex gap-3">
              <a href="https://twitter.com/athenis360" aria-label="Twitter" className="h-9 w-9 flex items-center justify-center rounded-lg bg-forest-900 hover:bg-forest-800 transition-colors">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/athenis360" aria-label="LinkedIn" className="h-9 w-9 flex items-center justify-center rounded-lg bg-forest-900 hover:bg-forest-800 transition-colors">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Produit</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/fonctionnalites" className="text-gray-400 hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link to="/tarifs" className="text-gray-400 hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/securite" className="text-gray-400 hover:text-white transition-colors">Sécurité</Link></li>
              <li><a href="https://athenis360.com/downloads/Athenis_x64_fr-FR.msi" className="text-gray-400 hover:text-white transition-colors">App Windows</a></li>
            </ul>
          </div>

          {/* Société */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Société</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/a-propos" className="text-gray-400 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><a href="mailto:contact@athenis360.com" className="text-gray-400 hover:text-white transition-colors">contact@athenis360.com</a></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Légal</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/rgpd" className="text-gray-400 hover:text-white transition-colors">RGPD</Link></li>
              <li><Link to="/cgu" className="text-gray-400 hover:text-white transition-colors">CGU</Link></li>
              <li><Link to="/mentions-legales" className="text-gray-400 hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link to="/cookies" className="text-gray-400 hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-forest-900 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Athenis. Tous droits réservés.
          </p>
          <p className="text-xs text-gray-500">
            🇨🇲 Conçu au Cameroun · 🇫🇷 Conforme PCG &amp; SYSCOHADA OHADA
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── Layout root ──────────────────────────────────────────────────────────────

export function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}
