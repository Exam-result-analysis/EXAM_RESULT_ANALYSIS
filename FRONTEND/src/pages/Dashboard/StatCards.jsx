import { Card } from '../../components/ui'

const stats = [['Students', '2,486', '+8.2% from last session', '◉', 'blue'], ['Departments', '12', 'Across 3 schools', '▦', 'purple'], ['Courses', '48', '5 new this academic year', '▤', 'orange'], ['Overall Pass %', '82.6%', '+3.4% from last session', '↗', 'green']]
export default function StatCards() { return <div className="stat-grid">{stats.map(([label, value, note, icon, tone]) => <Card key={label} className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><p>{label}</p><strong>{value}</strong><small className={note.startsWith('+') ? 'positive' : ''}>{note}</small></Card>)}</div> }
