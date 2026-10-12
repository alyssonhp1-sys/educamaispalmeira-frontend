export default function Kpi({ icon, value, label, hint, onClick, tone }) {
  const cls = `kpi${onClick ? " click" : ""}${tone ? ` kpi-${tone}` : ""}`;
  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {hint ? <em className="kpi-hint">{hint}</em> : null}
      </div>
    </div>
  );
}
