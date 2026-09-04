import { Shell } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <Shell user={user}>{children}</Shell>;
}
