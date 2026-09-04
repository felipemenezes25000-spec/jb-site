import { SenhaForm } from "@/components/admin/senha-form";
import { TituloPagina } from "@/components/admin/shell";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const user = await requireUser();

  return (
    <>
      <TituloPagina titulo="Minha conta" descricao={`${user.name} · ${user.email}`} />
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-5 font-semibold text-slate-900">Trocar senha</h2>
        <SenhaForm />
      </section>
    </>
  );
}
