import { Outlet, Link } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Link to="/" className="flex justify-center">
            <span className="text-3xl font-bold tracking-tight text-forest-900">Athenis</span>
          </Link>
          <p className="mt-2 text-center text-sm text-gray-500">
            Gestion financière 360
          </p>
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <Outlet />
        </div>
      </div>
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:bg-forest-900 lg:px-12">
        <blockquote className="mt-6 text-xl font-medium leading-8 text-white">
          Prenez le contrôle de votre gestion financière avec clarté et précision.
        </blockquote>
      </div>
    </div>
  )
}
