import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel JB" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      {children}
      <Toaster position="top-right" richColors />
    </div>
  );
}
