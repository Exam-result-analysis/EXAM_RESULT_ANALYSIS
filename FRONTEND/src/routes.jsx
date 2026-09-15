import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import DataInput from './pages/DataInput/DataInput'
import ResultsBrowser from './pages/ResultsBrowser/ResultsBrowser'
import Login from './pages/Login/Login'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="input" element={<DataInput />} />
        <Route path="results" element={<ResultsBrowser />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
