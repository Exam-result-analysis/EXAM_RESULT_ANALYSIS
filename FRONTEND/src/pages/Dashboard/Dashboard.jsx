import { useState } from 'react'
import StatCards from './StatCards'
import OverallPassChart from './OverallPassChart'
import ResultSummary from './ResultSummary'
import DepartmentResults from './DepartmentResults'
import './dashboard.css'
const filterOptions = { semester: ['Semester 6', 'Semester 5', 'Semester 4'], department: ['All departments', 'Computer Science', 'Electronics & Communication', 'Mechanical Engineering'], session: ['Apr 2026', 'Nov 2025', 'Apr 2025'] }
export default function Dashboard() { const [filters, setFilters] = useState({ semester: 'Semester 6', department: 'All departments', session: 'Apr 2026' }); return <main className="dashboard-page"><header className="dashboard-header"><div><p className="eyebrow">ACADEMIC ANALYTICS</p><h1>Results dashboard</h1><span>Review institutional performance at a glance.</span></div><button className="export-button">⇩&nbsp; Export report</button></header><section className="filter-bar" aria-label="Dashboard filters">{Object.entries(filterOptions).map(([name, options]) => <label key={name}><span>{name === 'session' ? 'Exam session' : name}</span><select value={filters[name]} onChange={(event) => setFilters({ ...filters, [name]: event.target.value })}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</section><StatCards /><section className="dashboard-grid"><OverallPassChart /><ResultSummary /><DepartmentResults /></section></main> }
