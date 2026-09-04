"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { MENU } from "@/lib/nav";

/** Porte fiel do inc_logo_menu.php — mesmas classes do Bootstrap 3. */
export function Header() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  useEffect(() => setAberto(false), [pathname]);

  return (
    <header className="navbar navbar-inverse navbar-fixed-top clouds-topo" role="banner">
      <div className="container">
        <div className="navbar-header">
          <button
            type="button"
            className="navbar-toggle"
            aria-expanded={aberto}
            aria-controls="navbar-principal"
            onClick={() => setAberto((v) => !v)}
          >
            <span className="sr-only">MENU</span>
            <span className="icon-bar" />
            <span className="icon-bar" />
            <span className="icon-bar" />
          </button>
          <Link className="navbar-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="logo" />
          </Link>
        </div>
        <div
          id="navbar-principal"
          className={aberto ? "collapse navbar-collapse in" : "collapse navbar-collapse"}
        >
          <ul className="nav navbar-nav navbar-right">
            {MENU.map((item) => {
              const ativo =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <li key={item.href} className={ativo ? "active" : undefined}>
                  <Link href={item.href} aria-current={ativo ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </header>
  );
}
