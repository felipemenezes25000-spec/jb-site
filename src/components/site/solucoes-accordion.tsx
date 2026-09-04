"use client";

import { useState } from "react";

export type SolucaoView = {
  id: string;
  nome: string;
  descricaoHtml: string;
  foto: string | null;
};

/**
 * Porte do painel de accordion do solucoes.php (Bootstrap 3 collapse),
 * com as mesmas classes e o mesmo comportamento de "só um aberto por vez".
 */
export function SolucoesAccordion({ solucoes }: { solucoes: SolucaoView[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (solucoes.length === 0) {
    return <p>Não há itens a serem exibidos.</p>;
  }

  return (
    <div className="panel-group" id="accordion1">
      {solucoes.map((item) => {
        const ativo = aberto === item.id;
        return (
          <div key={item.id} className="panel panel-default">
            <div className="panel-heading">
              <h4 className="panel-title">
                <a
                  className={ativo ? "accordion-toggle" : "accordion-toggle collapsed"}
                  href={`#collapse${item.id}`}
                  aria-expanded={ativo}
                  aria-controls={`collapse${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setAberto(ativo ? null : item.id);
                  }}
                >
                  <small>
                    <span
                      className={
                        ativo
                          ? "glyphicon glyphicon-chevron-up"
                          : "glyphicon glyphicon-chevron-down"
                      }
                    />
                  </small>
                  &nbsp;&nbsp;&nbsp;{item.nome}
                </a>
              </h4>
            </div>
            <div
              id={`collapse${item.id}`}
              className={ativo ? "panel-collapse collapse in" : "panel-collapse collapse"}
            >
              <div className="panel-body row">
                {item.foto ? (
                  <div className="col-lg-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.foto} alt={item.nome} className="img-responsive" />
                  </div>
                ) : null}
                <div
                  className={item.foto ? "col-lg-9" : "col-lg-12"}
                  dangerouslySetInnerHTML={{ __html: item.descricaoHtml }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
