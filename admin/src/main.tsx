import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1a2235',
          color: '#f1f5f9',
          border: '1px solid #2a3a52',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13.5px',
        },
        error: { style: { border: '1px solid rgba(229,57,53,0.4)' } },
        success: { style: { border: '1px solid rgba(16,185,129,0.4)' } },
      }}
    />
  </React.StrictMode>,
)
