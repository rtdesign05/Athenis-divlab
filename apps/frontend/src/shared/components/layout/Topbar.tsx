interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="flex h-[52px] shrink-0 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
      <button
        onClick={onMenuClick}
        aria-label="Menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className="flex items-center gap-2 ml-3">
        <img src="/logo-athenis.svg" alt="Athenis" className="h-6 w-6 rounded" />
        <span className="text-sm font-bold text-gray-900">Athenis</span>
      </div>
    </header>
  )
}
