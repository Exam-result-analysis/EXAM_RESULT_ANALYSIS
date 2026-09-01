import React, { createContext, useContext, useState } from 'react'

const FilterContext = createContext(null)

const initialFilters = {
  academic_year: '',
  semester: '',
  department_id: '',
  course_id: '',
  subject_id: '',
  session_id: '',
}

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState(initialFilters)

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const resetFilters = () => {
    setFilters(initialFilters)
  }

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, resetFilters }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}

export default FilterContext
