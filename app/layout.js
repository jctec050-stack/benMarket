import { Providers } from './providers'
import Navbar from '@/components/layout/Navbar'
import '@/app/globals.css'

export const metadata = {
  title: 'BenMarket - Tesorería',
  description: 'Sistema de gestión de tesorería para BenMarket',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
