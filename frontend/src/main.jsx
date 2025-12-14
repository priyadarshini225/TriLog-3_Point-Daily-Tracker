import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Apply persisted theme before first render to avoid a flash/reset.
try {
  const storedTheme = localStorage.getItem('trilog_theme')
  if (storedTheme === 'dark' || storedTheme === 'bw') {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
} catch {
  // ignore
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
