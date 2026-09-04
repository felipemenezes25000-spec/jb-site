import Link from "next/link";

/** Porte fiel do <section id="title"> usado nas páginas internas. */
export function PageTitle({ titulo, descricao }: { titulo: string; descricao?: string | null }) {
  return (
    <section id="title" className="concrete">
      <div className="container">
        <div className="row">
          <div className="col-sm-6">
            <h1>{titulo}</h1>
            <p>{descricao}</p>
          </div>
          <div className="col-sm-6">
            <ul className="breadcrumb pull-right">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li className="active">{titulo}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
