'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, profile, signOut } = useAuth()

  if (!user) return null

  let navLinks = [
    { href: '/', label: 'Ingresos' },
    { href: '/egresos', label: 'Egresos' },
    { href: '/arqueo', label: 'Arqueo de Caja' },
  ]

  if (profile?.rol === 'admin' || profile?.rol === 'tesoreria') {
    navLinks.splice(2, 0, { href: '/operaciones', label: 'Operaciones' })
    navLinks.push({ href: '/resumen', label: 'Resumen Tesoreria' })
    navLinks.push({ href: '/resumen-servicios', label: 'Resumen Servicios' })
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-gradient-to-r from-red-700 to-red-800 shadow-md border-b-4 border-red-900/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2">
               <div className="h-12 w-auto bg-white p-1 rounded-md">
                  <img src="/logo-benmarket.jpg" alt="BenMarket" className="h-full w-auto object-contain" />
               </div>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/90 hover:bg-white/20 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Info & Logout (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end text-white/90">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User size={16} />
                <span>{profile?.username || user.email}</span>
              </div>
              {profile?.rol && (
                <span className="text-xs text-red-200 capitalize -mt-1 mr-1">{profile.rol}</span>
              )}
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-white px-3 py-2 rounded-md text-sm font-medium transition-all border border-white/20 ml-2"
            >
              <LogOut size={16} />
              Salir
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-red-800 inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-red-700 focus:outline-none"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-red-800 pb-4 shadow-inner">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 block px-3 py-2 rounded-md text-base font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-red-700 px-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <User size={20} />
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium leading-none text-white">
                  {profile?.username || user.email}
                  {profile?.rol && <span className="ml-2 text-xs bg-red-900/50 px-2 py-0.5 rounded-full capitalize">{profile.rol}</span>}
                </div>
                <div className="text-sm font-medium leading-none text-red-200 mt-2">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => { signOut(); setIsOpen(false); }}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-red-900/50 text-white px-3 py-3 rounded-md text-base font-medium"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
