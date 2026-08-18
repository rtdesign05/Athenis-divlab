import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCountryConfig } from '@athenis/shared-types'
import { useDetectedCountry } from '@/hooks/useDetectedCountry'

type IconName = 'chart' | 'wallet' | 'people' | 'scale' | 'leaf' | 'building' | 'check' | 'arrow' | 'spark'

function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    chart: <><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" /><path d="m4 7 6-4 6 6 4-3" /></>,
    wallet: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H18v16H5.5A2.5 2.5 0 0 1 3 17.5z" /><path d="M3 7h15m-4 5h6v4h-6a2 2 0 0 1 0-4Z" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    scale: <><path d="m12 3-7 3 7 3 7-3-7-3Z" /><path d="M5 6v8m14-8v8M3 14h4l-2 4-2-4Zm14 0h4l-2 4-2-4ZM12 9v12" /></>,
    leaf: <><path d="M20 4c-7.5 0-13 2.5-13 8a5 5 0 0 0 5 5c5.5 0 8-5.5 8-13Z" /><path d="M4 21c2-5 5-8 11-11" /></>,
    building: <><path d="M4 21V4h11v17M2 21h20M8 8h3m-3 4h3m-3 4h3m6-6h3v11" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Zm14-2 .6 1.4L21 14l-1.4.6L19 16l-.6-1.4L17 14l1.4-.6L19 12Z" /></>,
  }
  return <svg aria-hidden className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.14 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`landing-reveal ${visible ? 'is-visible' : ''} ${className}`}>{children}</div>
}

function useMockNumbers() {
  const { countryCode } = useDetectedCountry('CM')
  const cfg = getCountryConfig(countryCode)
  if (cfg.currencyCode === 'XAF' || cfg.currencyCode === 'XOF') return { ca: `12,4 M ${cfg.currencySymbol}`, cash: `3,8 M ${cfg.currencySymbol}`, invoice: `850 000 ${cfg.currencySymbol}` }
  if (cfg.currencyCode === 'USD' || cfg.currencyCode === 'CAD') return { ca: '$24,000', cash: '$7,200', invoice: '$1,600' }
  return { ca: `24 000 ${cfg.currencySymbol}`, cash: `7 200 ${cfg.currencySymbol}`, invoice: `1 600 ${cfg.currencySymbol}` }
}

function HeroDashboard() {
  const mock = useMockNumbers()
  const bars = [36, 53, 44, 69, 58, 82, 66, 91, 77, 96, 85, 100]
  return (
    <div className="landing-dashboard-stage relative mx-auto w-full max-w-[590px] lg:mr-0">
      <div className="landing-orbit landing-orbit-one" />
      <div className="landing-orbit landing-orbit-two" />
      <div className="landing-dashboard relative overflow-hidden rounded-[28px] border border-white/80 bg-white/90 p-2 shadow-[0_40px_100px_-35px_rgba(13,34,25,.45)] backdrop-blur-xl">
        <div className="rounded-[22px] border border-gray-100 bg-[#f7faf8] p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-forest-900 font-bold text-white">A</div><div><p className="text-sm font-bold text-gray-900">Vue d'ensemble</p><p className="text-[11px] text-gray-500">Mise à jour à l'instant</p></div></div>
            <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-forest-300"/><span className="h-2 w-2 rounded-full bg-forest-500"/><span className="h-2 w-2 rounded-full bg-forest-800"/></div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[['Chiffre d’affaires', mock.ca, '+12,8 %'], ['Trésorerie', mock.cash, '+4,2 %'], ['À encaisser', mock.invoice, '3 factures']].map((item, i) => (
              <div key={item[0]} className={`rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-gray-400">{item[0]}</p><p className="mt-2 text-lg font-bold tracking-tight text-gray-900">{item[1]}</p><p className={`mt-1 text-[11px] font-semibold ${i === 2 ? 'text-amber-600' : 'text-forest-600'}`}>{item[2]}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.5fr_.8fr]">
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold text-gray-800">Activité financière</p><p className="text-[10px] text-gray-400">12 derniers mois</p></div><span className="rounded-full bg-forest-50 px-2 py-1 text-[9px] font-bold text-forest-700">+18,4 %</span></div>
              <div className="flex h-28 items-end gap-1.5">{bars.map((height, i) => <span key={i} className="landing-bar flex-1 rounded-t-md bg-gradient-to-t from-forest-800 to-forest-300" style={{ height: `${height}%`, animationDelay: `${i * 70}ms` }} />)}</div>
            </div>
            <div className="rounded-2xl bg-forest-950 p-4 text-white"><p className="text-[10px] uppercase tracking-widest text-forest-300">Santé globale</p><p className="mt-2 text-3xl font-bold">92<span className="text-sm text-forest-300">/100</span></p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[92%] rounded-full bg-gradient-to-r from-forest-400 to-amber-300"/></div><p className="mt-3 text-[10px] leading-relaxed text-forest-200">Tous vos indicateurs sont au vert.</p></div>
          </div>
        </div>
      </div>
      <div className="landing-float landing-float-left hidden sm:flex"><span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-100 text-forest-700"><Icon name="check" /></span><div><p className="text-xs font-bold text-gray-900">Facture réglée</p><p className="text-[10px] text-gray-500">Paiement rapproché automatiquement</p></div></div>
      <div className="landing-float landing-float-right hidden sm:flex"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70"/><span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"/></span><div><p className="text-xs font-bold text-gray-900">Échéance fiscale</p><p className="text-[10px] text-gray-500">Anticipée 5 jours avant</p></div></div>
    </div>
  )
}

const modules: { icon: IconName; label: string; desc: string; accent: string }[] = [
  { icon: 'wallet', label: 'Gestion commerciale', desc: 'Factures, devis, achats, stocks et trésorerie réunis dans un flux simple.', accent: 'from-blue-50 to-cyan-50 text-blue-700' },
  { icon: 'chart', label: 'Comptabilité', desc: 'Une comptabilité conforme, automatisée et lisible, du journal au bilan.', accent: 'from-forest-50 to-emerald-50 text-forest-700' },
  { icon: 'people', label: 'Ressources humaines', desc: 'Employés, contrats, congés et paie pilotés depuis le même espace.', accent: 'from-violet-50 to-purple-50 text-violet-700' },
  { icon: 'scale', label: 'Juridique', desc: 'Contrats, signatures et conformité suivis sans perdre une échéance.', accent: 'from-amber-50 to-orange-50 text-amber-700' },
  { icon: 'leaf', label: 'ESG & impact', desc: 'Mesurez vos engagements et transformez vos données en plans d’action.', accent: 'from-emerald-50 to-teal-50 text-emerald-700' },
  { icon: 'building', label: 'Fiscalité', desc: 'TVA, DSF, IS et obligations locales calculés dans leur bon contexte.', accent: 'from-rose-50 to-pink-50 text-rose-700' },
]

function SectionTitle({ tag, title, text, centered = false }: { tag: string; title: string; text: string; centered?: boolean }) {
  return <div className={`max-w-[680px] ${centered ? 'mx-auto text-center' : ''}`}><p className="mb-4 text-[11px] font-bold uppercase tracking-[.2em] text-amber-700">{tag}</p><h2 className="text-[1.85rem] font-bold leading-[1.15] tracking-[-.03em] text-gray-950 sm:text-[2.35rem] lg:text-[2.75rem]">{title}</h2><p className="mt-5 text-[15px] leading-7 text-gray-600 sm:text-base">{text}</p></div>
}

function HomePage() {
  const [activeStep, setActiveStep] = useState(0)
  const [openFaq, setOpenFaq] = useState(0)
  const steps = [
    ['01', 'Votre espace se configure', 'Choisissez votre pays et votre activité. Athenis adapte automatiquement la devise, la fiscalité et le plan comptable.'],
    ['02', 'Vos données prennent vie', 'Importez clients, fournisseurs et collaborateurs, puis laissez les modules communiquer entre eux.'],
    ['03', 'Vous pilotez en confiance', 'Suivez vos indicateurs, anticipez les échéances et prenez vos décisions depuis une vue claire.'],
  ]
  const faqs = [
    ['Athenis convient-il à mon pays ?', 'Oui. Athenis adapte les devises, référentiels et règles aux pays couverts, notamment SYSCOHADA en Afrique francophone et PCG en France.'],
    ['Puis-je commencer sans être comptable ?', 'Oui. Les parcours sont guidés et le vocabulaire reste accessible. Les opérations techniques sont automatisées en arrière-plan.'],
    ['Mes données sont-elles protégées ?', 'Les accès sont contrôlés par rôles, l’authentification à deux facteurs est disponible et les données sensibles sont chiffrées.'],
    ['Puis-je inviter mon équipe ou mon cabinet ?', 'Oui. Vous choisissez précisément les modules et actions accessibles à chaque collaborateur ou cabinet partenaire.'],
  ]
  return <div className="overflow-hidden bg-white text-gray-950">
    <section className="landing-hero relative isolate min-h-screen overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-28 lg:flex lg:items-center lg:pb-14 lg:pt-24">
      <div className="landing-grid absolute inset-0 -z-20"/><div className="landing-glow absolute left-1/2 top-0 -z-10 h-[680px] w-[900px] -translate-x-1/2 rounded-full bg-forest-100/70 blur-[110px]"/>
      <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[.94fr_1.06fr] lg:gap-10 lg:px-10">
        <div className="landing-hero-copy">
          <div className="landing-enter inline-flex items-center gap-2 rounded-full border border-forest-200/80 bg-white/70 px-3.5 py-2 text-xs font-semibold text-forest-800 shadow-sm backdrop-blur" style={{ animationDelay: '80ms' }}><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest-400 opacity-60"/><span className="relative inline-flex h-2 w-2 rounded-full bg-forest-600"/></span>La gestion nouvelle génération, pensée ici</div>
          <h1 className="landing-enter mt-6 max-w-[610px] text-[clamp(2.35rem,5vw,4.2rem)] font-bold leading-[1.02] tracking-[-.045em] text-gray-950" style={{ animationDelay: '160ms' }}>Toute votre entreprise.<br/><span className="landing-gradient-text">Enfin en mouvement.</span></h1>
          <p className="landing-enter mt-6 max-w-[560px] text-base leading-7 text-gray-600 sm:text-lg" style={{ animationDelay: '240ms' }}>Athenis relie gestion, comptabilité, paie, juridique et impact dans une expérience claire — pour vous laisser piloter, pas jongler.</p>
          <div className="landing-enter mt-9 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '320ms' }}><Link to="/auth/register" className="landing-primary group">Commencer gratuitement <Icon name="arrow" className="h-5 w-5 transition-transform group-hover:translate-x-1"/></Link><a href="#decouvrir" className="landing-secondary group">Explorer la plateforme <span className="ml-1 text-lg transition-transform group-hover:translate-y-0.5">↓</span></a></div>
          <div className="landing-enter mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-500" style={{ animationDelay: '400ms' }}>{['Sans carte bancaire', 'Configuration en 2 min', 'Conforme SYSCOHADA & PCG'].map(item => <span key={item} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-forest-100 text-forest-700"><Icon name="check" className="h-3.5 w-3.5"/></span>{item}</span>)}</div>
        </div>
        <div className="landing-enter" style={{ animationDelay: '280ms' }}><HeroDashboard /></div>
      </div>
    </section>

    <section className="border-y border-gray-100 bg-[#fbfcfb] py-8"><div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-5 lg:flex-row lg:justify-between lg:px-10"><p className="text-center text-xs font-bold uppercase tracking-[.18em] text-gray-400 lg:text-left">Une base solide pour grandir</p><div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-gray-500">{['SYSCOHADA 2017', 'Plan comptable général', 'RGPD', '2FA & chiffrement', 'Multi-entreprise'].map((item,i)=><span key={item} className="flex items-center gap-2 transition-colors hover:text-forest-700"><span className="text-forest-500">0{i+1}</span>{item}</span>)}</div></div></section>

    <section id="decouvrir" className="py-24 sm:py-32"><div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><Reveal><SectionTitle tag="Un écosystème cohérent" title="Six métiers. Une seule façon de travailler." text="Chaque action alimente la suivante. Une facture met à jour la trésorerie, la comptabilité et vos indicateurs — sans ressaisie." centered/></Reveal><div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map((module,i)=><Reveal key={module.label} delay={i*70}><Link to="/fonctionnalites" className="landing-module group flex h-full min-h-[270px] flex-col rounded-[24px] border border-gray-200/80 bg-white p-7"><span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${module.accent} transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-110`}><Icon name={module.icon} className="h-7 w-7"/></span><h3 className="mt-8 text-xl font-bold tracking-tight text-gray-900">{module.label}</h3><p className="mt-3 flex-1 text-sm leading-7 text-gray-600">{module.desc}</p><span className="mt-5 flex items-center gap-2 text-sm font-bold text-forest-700">Découvrir <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1.5"/></span></Link></Reveal>)}</div></div></section>

    <section className="relative bg-forest-950 py-24 text-white sm:py-32"><div className="absolute inset-0 overflow-hidden"><div className="absolute -right-28 top-10 h-80 w-80 rounded-full border border-white/10"/><div className="absolute -right-10 top-28 h-80 w-80 rounded-full border border-white/5"/></div><div className="relative mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:px-10"><Reveal><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-300">Simple par conception</p><h2 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-.04em] sm:text-5xl">De zéro à une vision claire, sans détour.</h2><p className="mt-6 max-w-lg text-lg leading-8 text-forest-100/70">Athenis transforme une configuration complexe en trois moments naturels. Vous avancez, le système s’adapte.</p><div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-forest-950"><Icon name="spark"/></span><div><p className="text-sm font-bold">Prêt en moins de 30 minutes</p><p className="text-xs text-forest-200/60">Et accompagné à chaque étape</p></div></div></div></Reveal><Reveal delay={150}><div className="space-y-3">{steps.map((step,i)=><button key={step[0]} type="button" onMouseEnter={()=>setActiveStep(i)} onFocus={()=>setActiveStep(i)} onClick={()=>setActiveStep(i)} className={`w-full rounded-[22px] border p-5 text-left transition-all duration-500 sm:p-6 ${activeStep===i?'translate-x-2 border-forest-400/40 bg-white text-gray-950 shadow-2xl':'border-white/10 bg-white/[.04] text-white hover:bg-white/[.08]'}`}><div className="flex gap-5"><span className={`text-sm font-bold ${activeStep===i?'text-forest-600':'text-forest-300'}`}>{step[0]}</span><div><h3 className="text-lg font-bold">{step[1]}</h3><div className={`grid transition-all duration-500 ${activeStep===i?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`}><p className="overflow-hidden pt-3 text-sm leading-7 text-gray-600">{step[2]}</p></div></div></div></button>)}</div></Reveal></div></section>

    <section className="py-24 sm:py-32"><div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2 lg:px-10"><Reveal><div className="relative rounded-[32px] bg-[#eff7f3] p-6 sm:p-10"><div className="landing-pulse-card rounded-[24px] bg-white p-6 shadow-xl shadow-forest-900/10"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Temps gagné ce mois</p><p className="mt-2 text-4xl font-bold tracking-tight text-gray-950">24h 30</p></div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-900 text-white"><Icon name="spark" className="h-7 w-7"/></span></div><div className="mt-8 space-y-4">{[['Facturation automatisée','8h'],['Rapprochement & comptabilité','11h'],['Paie et déclarations','5h30']].map((r,i)=><div key={r[0]}><div className="mb-2 flex justify-between text-xs font-semibold"><span className="text-gray-600">{r[0]}</span><span className="text-forest-700">{r[1]}</span></div><div className="h-2 rounded-full bg-gray-100"><div className="landing-progress h-full rounded-full bg-gradient-to-r from-forest-800 to-forest-400" style={{width:`${[62,84,47][i]}%`,animationDelay:`${i*180}ms`}}/></div></div>)}</div></div><div className="absolute -bottom-5 -right-3 rounded-2xl border border-white bg-amber-300 px-5 py-4 shadow-xl sm:-right-5"><p className="text-xs font-bold uppercase tracking-wider text-amber-950/60">Votre priorité</p><p className="mt-1 font-bold text-forest-950">Faire avancer l’entreprise.</p></div></div></Reveal><Reveal delay={120}><SectionTitle tag="Moins d’administration" title="Un outil qui travaille pendant que vous décidez." text="Les automatismes restent discrets, mais leurs effets sont visibles : moins de saisie, moins d’oublis et une information toujours à jour."/><ul className="mt-8 space-y-4">{['Des alertes pertinentes, jamais envahissantes','Des tableaux de bord qui expliquent avant d’afficher','Une expérience fluide sur web, ordinateur et mobile'].map(item=><li key={item} className="flex items-center gap-3 text-sm font-semibold text-gray-700"><span className="grid h-7 w-7 place-items-center rounded-full bg-forest-50 text-forest-700"><Icon name="check" className="h-4 w-4"/></span>{item}</li>)}</ul></Reveal></div></section>

    <section className="bg-[#f7faf8] py-24 sm:py-32"><div className="mx-auto max-w-3xl px-5 sm:px-8"><Reveal><SectionTitle tag="Questions fréquentes" title="Tout devient plus simple quand tout est clair." text="Les réponses essentielles avant de commencer." centered/></Reveal><div className="mt-12 space-y-3">{faqs.map((faq,i)=><Reveal key={faq[0]} delay={i*50}><button type="button" aria-expanded={openFaq===i} onClick={()=>setOpenFaq(openFaq===i?-1:i)} className={`w-full rounded-2xl border bg-white px-5 py-5 text-left transition-all ${openFaq===i?'border-forest-200 shadow-lg shadow-forest-900/5':'border-gray-200 hover:border-forest-200'}`}><div className="flex items-center justify-between gap-5"><span className="font-bold text-gray-900">{faq[0]}</span><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-50 text-xl text-forest-700 transition-transform ${openFaq===i?'rotate-45':''}`}>+</span></div><div className={`grid transition-all duration-300 ${openFaq===i?'grid-rows-[1fr] opacity-100':'grid-rows-[0fr] opacity-0'}`}><p className="overflow-hidden pt-4 text-sm leading-7 text-gray-600">{faq[1]}</p></div></button></Reveal>)}</div></div></section>

    <section className="px-5 py-20 sm:px-8 sm:py-28"><Reveal className="mx-auto max-w-7xl"><div className="landing-cta relative overflow-hidden rounded-[32px] bg-forest-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20"><div className="absolute inset-0 opacity-30"><div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-forest-400 blur-[90px]"/><div className="absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-amber-300 blur-[100px]"/></div><div className="relative"><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-300">Le bon moment, c’est maintenant</p><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-.04em] sm:text-5xl lg:text-6xl">Votre entreprise mérite une vision à 360°.</h2><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-forest-100/70">Créez votre espace gratuitement et découvrez une gestion enfin fluide, cohérente et agréable.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/auth/register" className="landing-primary !bg-white !text-forest-950 hover:!bg-forest-50">Créer mon espace <Icon name="arrow" className="h-5 w-5"/></Link><Link to="/contact" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Parler à un expert</Link></div></div></div></Reveal></section>
  </div>
}

export { HomePage }
