import React, { createContext, useContext, useState } from 'react'

const FilterContext = createContext(null)

const initialFilters = {
  degree_code: '',
  curr_sems: '',
  type_code: '',
  status_code: '',
  regn_numb: '',
  subject_code: '',
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
