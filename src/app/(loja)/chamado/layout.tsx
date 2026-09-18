import type { ReactNode } from "react";

import { ConfirmarConversaoAssistencia } from "@/components/assistencia/confirmar-conversao";

export default function ChamadoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ConfirmarConversaoAssistencia />
    </>
  );
}
