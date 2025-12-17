"use client"

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#0F172A',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
          fontWeight: '500',
        },
        // Success
        success: {
          duration: 3000,
          style: {
            background: '#FFFFFF',
            color: '#16A34A',
            border: '1px solid #86EFAC',
          },
          iconTheme: {
            primary: '#16A34A',
            secondary: '#FFFFFF',
          },
        },
        // Error
        error: {
          duration: 5000,
          style: {
            background: '#FFFFFF',
            color: '#DC2626',
            border: '1px solid #FCA5A5',
          },
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FFFFFF',
          },
        },
        // Loading
        loading: {
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
          },
          iconTheme: {
            primary: '#0F172A',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  )
}
