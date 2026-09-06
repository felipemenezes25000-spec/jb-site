import { Casca } from "@/components/admin/casca";
import { sessaoStaff } from "@/lib/auth";
import { ROTULO_PAPEL, menuDoUsuario } from "@/lib/permissoes";

/*
 * Migração para Cache Components.
 *
 * Este layout lê a sessão da equipe a cada requisição — é ele que decide o
 * que aparece no menu. `instant = false` diz ao Next para não validar
 * navegação instantânea neste segmento, que é a saída documentada para migrar
 * rota a rota. A área é autenticada e não tem casca estática a economizar.
 *
 * Pendência declarada em docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

/**
 * Layout do painel — casca e sessão.
 *
 * POR QUE A GUARDA NÃO REDIRECIONA AQUI
 *
 * `/admin/entrar` é filha de `/admin`, então este layout também embrulha a
 * própria tela de entrada. E, neste App Router, um layout não tem como saber
 * qual rota está sendo pedida: `params` só traz segmentos dinâmicos, não existe
 * `pathname` no servidor e os layouts são reaproveitados entre navegações
 * justamente para não reler a requisição (ver
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md,
 * seção "Caveats · Request Object"). Grupo de rotas também não resolve: o
 * caminho `/admin/entrar` obriga o arquivo a ficar debaixo de `/admin`.
 *
 * Se este layout chamasse `exigirStaff()`, quem ainda não entrou seria
 * redirecionado para a tela de entrada — que é justamente a página que ele está
 * tentando abrir — e o resultado seria um laço de redirecionamento.
 *
 * A solução usada aqui é a que o App Router suporta de verdade:
 *
 *   1. Sem sessão, o layout devolve `children` sem casca. A única página que
 *      renderiza nesse estado é `/admin/entrar`, que se desenha inteira.
 *   2. A autorização de verdade fica em cada página, com `exigirArea(area)` de
 *      `@/lib/permissoes` — que redireciona para `/admin/entrar` sem sessão e
 *      para `/admin?erro=permissao` quando o papel não alcança a área.
 *
 * Ou seja: a casca é cosmética, a guarda é da página. Toda página nova dentro
 * de /admin precisa começar com `exigirArea(...)`.
 */
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const usuario = await sessaoStaff();

  if (!usuario) return <>{children}</>;

  return (
    <Casca
      usuario={{
        nome: usuario.name,
        email: usuario.email,
        papel: ROTULO_PAPEL[usuario.role],
      }}
      grupos={menuDoUsuario(usuario)}
    >
      {children}
    </Casca>
  );
}
