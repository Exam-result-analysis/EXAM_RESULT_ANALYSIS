export default function Card({ children, className = '', title, action }) {
  return <section className={`ui-card ${className}`.trim()}>{(title || action) && <header className="ui-card__header">{title && <h2>{title}</h2>}{action}</header>}{children}</section>
}
