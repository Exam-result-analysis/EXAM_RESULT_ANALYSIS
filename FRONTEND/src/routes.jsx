import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import DepartmentAnalysis from './pages/DepartmentAnalysis/DepartmentAnalysis'
import CourseAnalysis from './pages/CourseAnalysis/CourseAnalysis'
import SessionAnalysis from './pages/SessionAnalysis/SessionAnalysis'
import ExamModeAnalysis from './pages/ExamModeAnalysis/ExamModeAnalysis'
import DataInput from './pages/DataInput/DataInput'
import Reports from './pages/Reports/Reports'
import Login from './pages/Login/Login'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="departments" element={<DepartmentAnalysis />} />
        <Route path="courses" element={<CourseAnalysis />} />
        <Route path="sessions" element={<SessionAnalysis />} />
        <Route path="modes" element={<ExamModeAnalysis />} />
        <Route path="input" element={<DataInput />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
