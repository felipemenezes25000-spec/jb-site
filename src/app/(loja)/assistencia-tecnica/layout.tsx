import type { ReactNode } from "react";

import { DockConversaoAssistencia } from "@/components/assistencia/dock-conversao";
import { TelemetriaAssistencia } from "@/components/assistencia/telemetria-assistencia";

import "./assistencia.css";

export default function AssistenciaTecnicaLayout({ children }: { children: ReactNode }) {
  return (
    <div data-assistencia-shell>
      {children}
      <TelemetriaAssistencia />
      <DockConversaoAssistencia />
    </div>
  );
}
