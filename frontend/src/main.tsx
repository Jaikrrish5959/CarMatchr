import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { DataProvider } from './contexts/DataContext.tsx'
import { LanguageProvider } from './contexts/LanguageContext.tsx'
import { CatalogProvider } from './contexts/CatalogContext.tsx'
import { Toaster } from 'react-hot-toast'

const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    if (typeof input === 'string') {
      if (input.startsWith('/api/') || input.startsWith('/uploads/')) {
        input = apiUrl + input;
      }
    }
    return originalFetch.apply(this, [input, init]);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <CatalogProvider>
        <AuthProvider>
          <DataProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '14px',
                  border: '1px solid #fca5a5',
                  background: '#fff1f2',
                  color: '#9f1239',
                  fontWeight: '600',
                },
              }}
            />
          </DataProvider>
        </AuthProvider>
      </CatalogProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
