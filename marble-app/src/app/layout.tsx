import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'ניהול מלאי שיש | Marble Inventory',
  description: 'מערכת ניהול מלאי מקצועית לתצוגת שיש ואבן',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a2e',
                color: '#c9a84c',
                borderRadius: '12px',
                border: '1px solid rgba(201,168,76,0.3)',
                fontFamily: 'inherit',
                direction: 'rtl',
              },
              success: {
                iconTheme: { primary: '#c9a84c', secondary: '#1a1a2e' },
              },
              error: {
                style: { background: '#1a1a2e', color: '#ef4444' },
                iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
