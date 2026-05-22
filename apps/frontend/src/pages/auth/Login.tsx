import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { LoginRequest, LoginResponse } from '@athenis/shared-types'

export function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post<LoginResponse>('/auth/login', form)
      navigate('/dashboard')
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="input mt-1"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="input mt-1"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
      <p className="text-center text-sm">
        <Link to="/auth/forgot-password" className="text-forest-700 hover:text-forest-900 hover:underline">
          Mot de passe oublié ?
        </Link>
      </p>
      <p className="text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link to="/auth/register" className="font-medium text-forest-700 hover:text-forest-900">
          S'inscrire
        </Link>
      </p>
    </form>
  )
}
