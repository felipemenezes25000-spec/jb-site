"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SlideView = {
  id: string;
  imagem: string;
  titulo: string | null;
  subtitulo: string | null;
  link: string | null;
};

/**
 * Porte do inc_destaques.php. Reproduz a sequência de classes do carrossel do
 * Bootstrap 3 (item → next/prev → left/right → active) para o deslize sair
 * igual ao original, mas sem jQuery. Intervalo de 8s, como no main.js.
 */
export function MainSlider({ slides }: { slides: SlideView[] }) {
  const [atual, setAtual] = useState(0);
  const itens = useRef<(HTMLDivElement | null)[]>([]);
  const ocupado = useRef(false);

  const ir = useCallback(
    (destino: number, direcao: "next" | "prev") => {
      if (ocupado.current || destino === atual || slides.length < 2) return;
      const saindo = itens.current[atual];
      const entrando = itens.current[destino];
      if (!saindo || !entrando) return;

      ocupado.current = true;
      const lado = direcao === "next" ? "left" : "right";

      entrando.classList.add(direcao);
      void entrando.offsetWidth; // força o reflow antes de animar
      saindo.classList.add(lado);
      entrando.classList.add(lado);

      let encerrado = false;
      const encerrar = () => {
        if (encerrado) return;
        encerrado = true;
        entrando.classList.remove(direcao, lado);
        entrando.classList.add("active");
        saindo.classList.remove("active", lado);
        ocupado.current = false;
        setAtual(destino);
      };

      entrando.addEventListener("transitionend", encerrar, { once: true });
      window.setTimeout(encerrar, 700);
    },
    [atual, slides.length],
  );

  const proximo = useCallback(
    () => ir((atual + 1) % slides.length, "next"),
    [atual, ir, slides.length],
  );
  const anterior = useCallback(
    () => ir((atual - 1 + slides.length) % slides.length, "prev"),
    [atual, ir, slides.length],
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(proximo, 8000);
    return () => window.clearInterval(id);
  }, [proximo, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section id="main-slider" className="no-margin">
      <div className="carousel slide concrete">
        <div className="carousel-inner">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              ref={(el) => {
                itens.current[i] = el;
              }}
              className={i === atual ? "item active" : "item"}
              style={{
                backgroundImage: `url(${slide.imagem})`,
                ...(slide.link ? { cursor: "pointer" } : null),
              }}
              onClick={slide.link ? () => (window.location.href = slide.link!) : undefined}
            >
              <div className="container">
                <div className="row">
                  <div className="col-sm-12 hidden-xs">
                    <div className="carousel-content centered">
                      {slide.titulo ? (
                        <h2 className="animation animated-item-1 boxed">{slide.titulo}</h2>
                      ) : null}
                      {slide.subtitulo ? (
                        <>
                          <br />
                          <p className="animation animated-item-2 boxed">{slide.subtitulo}</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <a
            className="prev hidden-xs"
            href="#main-slider"
            aria-label="Anterior"
            onClick={(e) => {
              e.preventDefault();
              anterior();
            }}
          >
            <i className="fa fa-angle-left" />
          </a>
          <a
            className="next hidden-xs"
            href="#main-slider"
            aria-label="Próximo"
            onClick={(e) => {
              e.preventDefault();
              proximo();
            }}
          >
            <i className="fa fa-angle-right" />
          </a>
        </>
      ) : null}
    </section>
  );
}
