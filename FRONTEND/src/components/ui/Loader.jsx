import React from 'react'

export default function Loader({ message = 'Loading data...', size = 'medium' }) {
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-3',
    large: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3">
      <div
        className={`${sizeClasses[size] || sizeClasses.medium} border-blue-500 border-t-transparent rounded-full animate-spin`}
      />
      {message && <span className="text-sm font-medium">{message}</span>}
    </div>
  )
}
