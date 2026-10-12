import { useEffect } from "react";

export default function Modal({
  title,
  onClose,
  children,
  footer,
  large,
  closeOnOverlay = false,
  variant = "default",
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape" && onClose) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={closeOnOverlay && onClose ? onClose : undefined}>
      <div
        className={`modal ${large ? "lg" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={`modal-h${variant === "danger" ? " modal-h-danger" : ""}`}>
          <span id="modal-title">{title}</span>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Fechar" title="Fechar">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  );
}
