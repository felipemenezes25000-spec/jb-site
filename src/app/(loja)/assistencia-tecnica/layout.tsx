import type { ReactNode } from "react";

import { DockConversaoAssistencia } from "@/components/assistencia/dock-conversao";

import "./assistencia.css";

export default function AssistenciaTecnicaLayout({ children }: { children: ReactNode }) {
  return (
    <div data-assistencia-shell>
      {children}
      <DockConversaoAssistencia />
    </div>
  );
}
