import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { ResumoColaborador, Usuario } from "../types";
import { Escala } from "./Escala";

type ColaboradorViewProps = {
  usuario: Usuario;
  onUsuarioAtualizado: () => Promise<void>;
  mostrarProgresso?: boolean;
};

type Formulario = {
  humor: number;
  energia: number;
  sono: number;
  estresse: number;
  observacao: string;
};

type RespostaCheckin = {
  mensagem: string;
  criado: boolean;
  pontosGanhos: number;
};

const formularioInicial: Formulario = {
  humor: 3,
  energia: 3,
  sono: 3,
  estresse: 3,
  observacao: ""
};

async function buscarResumo(usuarioId: number) {
  return api<ResumoColaborador>(`/checkins/usuario/${usuarioId}/resumo`);
}

function nomeDoDia(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC"
  })
    .format(new Date(data))
    .replace(".", "");
}

export function ColaboradorView({ usuario, onUsuarioAtualizado, mostrarProgresso = false }: ColaboradorViewProps) {
  const [resumo, setResumo] = useState<ResumoColaborador | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(formularioInicial);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    buscarResumo(usuario.id)
      .then((dados) => {
        if (!ativo) return;
        setResumo(dados);
        setMensagem(null);
        setErro(null);
        setFormulario(
          dados.checkinHoje
            ? {
                humor: dados.checkinHoje.humor,
                energia: dados.checkinHoje.energia,
                sono: dados.checkinHoje.sono ?? 3,
                estresse: dados.checkinHoje.estresse ?? 3,
                observacao: dados.checkinHoje.observacao ?? ""
              }
            : formularioInicial
        );
      })
      .catch((falha: Error) => {
        if (ativo) setErro(falha.message);
      });

    return () => {
      ativo = false;
    };
  }, [usuario.id]);

  function alterar(campo: keyof Formulario, valor: string | number) {
    setFormulario((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarCheckin(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setMensagem(null);
    setErro(null);

    try {
      const resposta = await api<RespostaCheckin>("/checkins", {
        method: "POST",
        body: JSON.stringify({ usuarioId: usuario.id, ...formulario })
      });
      setMensagem(resposta.mensagem);
      const [novoResumo] = await Promise.all([buscarResumo(usuario.id), onUsuarioAtualizado()]);
      setResumo(novoResumo);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao salvar check-in.");
    } finally {
      setSalvando(false);
    }
  }

  if (!resumo) {
    return <div className="carregando-card">Carregando seu resumo...</div>;
  }

  const primeiroNome = usuario.nome.split(" ")[0];

  return (
    <div className={`pagina fade-in${mostrarProgresso ? " progresso-pagina" : ""}`}>
      <section className="cabecalho-pagina">
        <div>
          <span className="eyebrow">Seu espaço de bem-estar</span>
          <h1>Olá, {primeiroNome}. Como você está hoje?</h1>
          <p>Reserve um minuto para perceber seu dia e acompanhar sua evolução.</p>
        </div>
        <div className="data-hoje">
          <strong>{nomeDoDia(`${resumo.hoje}T12:00:00.000Z`)}</strong>
          <span>{resumo.checkinHoje ? "Check-in concluído" : "Check-in pendente"}</span>
        </div>
      </section>

      <section className="metricas-resumo" aria-label="Resumo pessoal">
        <article className="metrica-card destaque-verde">
          <span className="metrica-rotulo">Sequência atual</span>
          <strong>{resumo.sequencia} dias</strong>
          <small>Consistência na última semana</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Seus pontos</span>
          <strong>{usuario.pontosTotal}</strong>
          <small>+10 por novo check-in</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Humor médio</span>
          <strong>
            {resumo.medias.humor ?? "—"}
            <em>/5</em>
          </strong>
          <small>Últimos sete dias</small>
        </article>
        <article className="metrica-card">
          <span className="metrica-rotulo">Energia média</span>
          <strong>
            {resumo.medias.energia ?? "—"}
            <em>/5</em>
          </strong>
          <small>Últimos sete dias</small>
        </article>
      </section>

      <section className="grade-principal">
        {!mostrarProgresso && (
          <article className="painel checkin-painel">
            <div className="painel-titulo">
              <div>
                <span className="eyebrow">Check-in diário</span>
                <h2>Conte como foi seu dia</h2>
              </div>
              <span className="tempo-estimado">~ 1 minuto</span>
            </div>

            <form onSubmit={salvarCheckin}>
              <div className="escalas-grid">
                <Escala
                  titulo="Humor"
                  descricao="Como está seu estado emocional?"
                  valor={formulario.humor}
                  inicio="Muito baixo"
                  fim="Muito bom"
                  onChange={(valor) => alterar("humor", valor)}
                />
                <Escala
                  titulo="Energia"
                  descricao="Como está sua disposição?"
                  valor={formulario.energia}
                  inicio="Sem energia"
                  fim="Cheio de energia"
                  onChange={(valor) => alterar("energia", valor)}
                />
                <Escala
                  titulo="Sono"
                  descricao="Como você avalia seu sono?"
                  valor={formulario.sono}
                  inicio="Ruim"
                  fim="Excelente"
                  onChange={(valor) => alterar("sono", valor)}
                />
                <Escala
                  titulo="Estresse"
                  descricao="Qual foi seu nível de tensão?"
                  valor={formulario.estresse}
                  inicio="Muito baixo"
                  fim="Muito alto"
                  onChange={(valor) => alterar("estresse", valor)}
                />
              </div>

              <label className="observacao-campo">
                <span>
                  Uma observação sobre hoje <small>(opcional)</small>
                </span>
                <textarea
                  value={formulario.observacao}
                  maxLength={500}
                  placeholder="Ex.: consegui fazer uma pausa durante a tarde..."
                  onChange={(evento) => alterar("observacao", evento.target.value)}
                />
              </label>

              {mensagem && <div className="feedback sucesso">{mensagem}</div>}
              {erro && <div className="feedback erro">{erro}</div>}

              <div className="form-rodape">
                <span>Seus dados individuais são visíveis somente para você.</span>
                <button className="botao-primario" disabled={salvando} type="submit">
                  {salvando ? "Salvando..." : resumo.checkinHoje ? "Atualizar check-in" : "Concluir check-in"}
                </button>
              </div>
            </form>
          </article>
        )}

        <aside className="painel historico-painel">
          <div className="painel-titulo">
            <div>
              <span className="eyebrow">Progresso pessoal</span>
              <h2>Últimos registros</h2>
            </div>
          </div>

          <div className="historico-lista">
            {[...resumo.historico].reverse().map((checkin) => (
              <div className="historico-item" key={checkin.id}>
                <div className="historico-data">
                  <strong>{nomeDoDia(checkin.data)}</strong>
                  <span>
                    {checkin.data.slice(8, 10)}/{checkin.data.slice(5, 7)}
                  </span>
                </div>
                <div className="historico-notas">
                  <span>
                    <small>Humor</small>
                    {checkin.humor}
                  </span>
                  <span>
                    <small>Energia</small>
                    {checkin.energia}
                  </span>
                  <span>
                    <small>Estresse</small>
                    {checkin.estresse ?? "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="privacidade-aviso">
            <span className="cadeado">●</span>
            <p>
              <strong>Privacidade desde a estrutura</strong>O RH recebe apenas indicadores coletivos e anônimos.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
