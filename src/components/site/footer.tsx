import Link from "next/link";

import { GoToTop } from "@/components/site/go-to-top";
import { MENU } from "@/lib/nav";
import { getSettings, redesSociais, splitTelefoneRodape } from "@/lib/settings";

/** Porte fiel do inc_footer.php. */
export async function Footer() {
  const s = await getSettings();
  const telefone = splitTelefoneRodape(s.telefone_rodape);
  const sociais = redesSociais(s);

  return (
    <footer id="footer" className="carrot">
      <div className="container">
        <div className="row">
          <div className="col-sm-6">
            <h4>
              <span className="ddd">{telefone.ddd}</span> {telefone.numero}
            </h4>
            <p>{s.endereco_rodape}</p>©&nbsp;{new Date().getFullYear()}, {s.site_titulo}. Todos
            os direitos reservados. Desenvolvido por{" "}
            <a href="http://www.g4web.com.br" target="_blank" rel="noopener noreferrer">
              G4web
            </a>
            .
            <p>
              {sociais.map((rede, i) => (
                <a
                  key={rede.key}
                  href={rede.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={rede.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rede.img}
                    alt={rede.label}
                    className="facebook"
                    style={i > 0 ? { marginLeft: 3 } : undefined}
                  />
                </a>
              ))}
            </p>
          </div>
          <div className="col-sm-6">
            <ul className="pull-right">
              {MENU.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
              <li>
                <GoToTop />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
