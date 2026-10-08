import { useEffect, useState } from "react";
import { excluirHabito, iniciarHabitos, listarHabitos, registrarHabito, salvarConfiguracaoHabito } from "../services/habitos-api";
import type { ConfiguracaoHabito, PaginaHabitos, RegistroHabitoInput } from "../types/habitos";

type EstadoHabitos = { data: string; revisao: number; pagina: PaginaHabitos | null; erro: string };

export function useHabitos(usuarioId: number, data: string) {
  const [estado, setEstado] = useState<EstadoHabitos | null>(null);
  const [revisao, setRevisao] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        await iniciarHabitos(usuarioId);
        const pagina = await listarHabitos(usuarioId, data);
        if (ativo) setEstado({ data, revisao, pagina, erro: "" });
      } catch (falha) {
        if (ativo)
          setEstado({
            data,
            revisao,
            pagina: null,
            erro: falha instanceof Error ? falha.message : "Não foi possível carregar seus hábitos."
          });
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [usuarioId, data, revisao]);

  async function executar<T>(operacao: () => Promise<T>, sucesso: string) {
    setSalvando(true);
    setMensagem("");
    try {
      const resultado = await operacao();
      const pagina = await listarHabitos(usuarioId, data);
      setEstado({ data, revisao, pagina, erro: "" });
      setMensagem(sucesso);
      return resultado;
    } catch (falha) {
      const erro =
        falha instanceof Error ? falha.message : "Não foi possível salvar. Seus dados preenchidos foram preservados.";
      setEstado((atual) => ({ data, revisao, pagina: atual?.pagina ?? null, erro }));
      throw falha;
    } finally {
      setSalvando(false);
    }
  }

  return {
    pagina: estado?.pagina ?? null,
    carregando: estado?.data !== data || estado?.revisao !== revisao,
    salvando,
    erro: estado?.data === data && estado.revisao === revisao ? estado.erro : "",
    mensagem,
    carregar: () => setRevisao((atual) => atual + 1),
    excluir: (id: number) => executar(() => excluirHabito(usuarioId, id), "Hábito excluído."),
    salvarConfiguracao: (dados: ConfiguracaoHabito, id?: number) =>
      executar(
        () => salvarConfiguracaoHabito(usuarioId, dados, id),
        id ? "Hábito atualizado." : "Hábito criado. Um passo de cada vez."
      ),
    registrar: (id: number, dados: RegistroHabitoInput) =>
      executar(
        () => registrarHabito(usuarioId, id, dados),
        dados.pausado
          ? "Tudo bem diminuir o ritmo hoje. Seu hábito estará disponível novamente no próximo dia programado."
          : "Progresso salvo."
      )
  };
}
