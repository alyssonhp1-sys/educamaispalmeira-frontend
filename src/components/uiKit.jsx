import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "./Modal.jsx";
import { formatarDataBr } from "../ui.js";

export function PageHeader({ kicker, title, description, actions, children }) {
  return (
    <div className="page-head">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-meta">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </div>
  );
}

export function FeedbackMessage({ type = "info", children }) {
  if (!children) return null;
  const cls = type === "error" ? "danger" : type;
  return (
    <div className={`alert alert-${cls}`} role={type === "error" || type === "danger" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      {title ? <strong>{title}</strong> : null}
      {children ? (typeof children === "string" ? <p>{children}</p> : children) : null}
    </div>
  );
}

export function LoadingState({ texto = "Carregando..." }) {
  return (
    <p className="loading-state">
      <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
      {texto}
    </p>
  );
}

export function Field({ id, label, required, error, help, children, className }) {
  return (
    <div className={`field ${className || ""}`.trim()}>
      {label ? (
        <label className="label" htmlFor={id}>
          {label}
          {required ? <span className="req" aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {!error && help ? <p className="help-text">{help}</p> : null}
    </div>
  );
}

export function DateInput({ id, value, onChange, className, ...rest }) {
  const br = formatarDataBr(value);
  return (
    <div className="date-input-wrap">
      <input
        id={id}
        className={`input ${className || ""}`.trim()}
        type="date"
        value={value}
        onChange={onChange}
        {...rest}
      />
      {br ? <span className="date-br">{br}</span> : null}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <Modal
      title={title}
      variant={danger ? "danger" : "default"}
      onClose={busy ? () => {} : onCancel}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Aguarde..." : confirmLabel}
          </button>
        </>
      )}
    >
      <p>{message}</p>
    </Modal>
  );
}

export function Breadcrumb({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumb" aria-label="Navegação">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="breadcrumb-item">
          {i > 0 ? <span className="breadcrumb-sep" aria-hidden="true">›</span> : null}
          {item.to ? (
            <Link to={item.to} state={item.state}>{item.label}</Link>
          ) : item.onClick ? (
            <button type="button" className="text-link" onClick={item.onClick}>{item.label}</button>
          ) : (
            <span aria-current={i === items.length - 1 ? "page" : undefined}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function AtencaoNecessaria({ titulo = "Atenção necessária", itens = [], vazio = "Nenhuma pendência no momento." }) {
  const visiveis = itens.filter((i) => Number(i.quantidade) > 0);
  return (
    <section className="section section-fold">
      <div className={`atencao ${visiveis.length ? "" : "atencao-ok"}`}>
        <h2 className="section-title">{titulo}</h2>
        {visiveis.length ? (
          <ul className="atencao-lista">
            {visiveis.map((i) => (
              <li key={i.id || i.rotulo} className={i.critico ? "atencao-critico" : undefined}>
                <span>
                  <strong>{i.quantidade}</strong>
                  {" "}
                  {i.rotulo}
                </span>
                {i.onAction ? (
                  <button type="button" className="btn btn-sm btn-outline" onClick={i.onAction}>
                    {i.acaoLabel || "Ver"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-sub">{vazio}</p>
        )}
      </div>
    </section>
  );
}

export function ActionMenu({ label = "Mais ações", items = [] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const btnRef = useRef(null);

  function abrir() {
    if (open) {
      setOpen(false);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onMove() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div className="action-menu" ref={ref}>
      <button
        type="button"
        ref={btnRef}
        className="btn btn-sm btn-ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={abrir}
      >
        {label}
      </button>
      {open ? (
        <div
          className="action-menu-list"
          role="menu"
          style={pos ? { top: pos.top, right: pos.right } : undefined}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`action-menu-item${item.danger ? " danger" : ""}`}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                if (item.onClick) item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
