"use client";

/** Substitui o $('.gototop').click() do main.js, sem jQuery. */
export function GoToTop() {
  return (
    <a
      id="gototop"
      className="gototop"
      href="#"
      aria-label="Voltar ao topo"
      onClick={(event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <i className="fa fa-chevron-up" />
    </a>
  );
}
