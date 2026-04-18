'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [caja, setCaja] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn } = useAuth()
  const { setSelectedCaja } = useData()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Get email from username (RPC call to Supabase)
      const { data: email, error: emailError } = await supabase
        .rpc('get_user_email_by_username', { p_username: username })

      if (emailError || !email) {
        throw new Error('Usuario no encontrado')
      }

      // 2. Sign in
      const { data, error: signInError } = await signIn(email, password)
      
      if (signInError) {
        throw new Error('Contraseña incorrecta')
      }

      // 3. Get User Profile for Role Validation
      const { data: profile, error: profileError } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Error al obtener perfil')
      }

      if (!profile.activo) {
        await supabase.auth.signOut()
        throw new Error('Usuario desactivado')
      }

      // 4. Role & Box Validation
      if (caja === 'Tesoreria' && !['tesoreria', 'admin'].includes(profile.rol)) {
        await supabase.auth.signOut()
        throw new Error('Acceso denegado a Tesorería')
      }

      if (profile.rol === 'cajero' && !caja) {
        throw new Error('Seleccione una caja')
      }

      // 5. Save Box Selection to Session Storage (Context handles global state but this persists reload for now)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cajaSeleccionada', caja)
        sessionStorage.setItem('userRole', profile.rol)
      }
      
      // Force immediate context update
      setSelectedCaja(caja)

      router.push('/')
      
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          {/* Use Next.js Image in real app, standard img for now */}
          <img src="/logo-benmarket.jpg" alt="BenMarket" className="h-20 w-auto object-contain" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-red-700 mb-2">Iniciar Sesión</h2>
        <p className="text-gray-500 text-center mb-8">Ingrese sus credenciales para continuar</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              placeholder="Nombre de usuario"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Caja Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Caja</label>
            <select
              value={caja}
              onChange={(e) => setCaja(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white"
              required
            >
              <option value="" disabled>-- Seleccione Caja --</option>
              <option value="Caja 1">Caja 1</option>
              <option value="Caja 2">Caja 2</option>
              <option value="Caja 3">Caja 3</option>
              <option value="Tesoreria">Tesoreria</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
