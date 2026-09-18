import type { ReactNode } from "react";

import { DockConversaoAssistencia } from "@/components/assistencia/dock-conversao";

import "./assistencia.css";

export default function AssistenciaTecnicaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DockConversaoAssistencia />
    </>
  );
}
