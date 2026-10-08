import { useEffect, useRef, useState } from "react";
import { useHabitos } from "../hooks/useHabitos";
import { useLembretesHabitos } from "../hooks/useLembretesHabitos";
import { dataSaoPaulo, diasDaSemana, formatarDia } from "../services/habitos-api";
import type { Habito } from "../types/habitos";
import type { Usuario } from "../types";
import { GraficoHabitos } from "./GraficoHabitos";
import { HabitoCard } from "./HabitoCard";
import { HabitoDetalhes } from "./HabitoDetalhes";
import { HabitoForm } from "./HabitoForm";
import { ProgressBar } from "./ProgressBar";
import "../styles/habitos.css";

type HabitosViewProps = { usuario: Usuario };

export function HabitosView({ usuario }: HabitosViewProps) {
  const [data, setData] = useState(dataSaoPaulo);
  const [formulario, setFormulario] = useState<Habito | "novo" | null>(null);
  const [detalhe, setDetalhe] = useState<{ habito: Habito; iniciar: boolean } | null>(null);
  const hojeRef = useRef(dataSaoPaulo());
  const { pagina, carregando, salvando, erro, mensagem, carregar, registrar, salvarConfiguracao, excluir } = useHabitos(
    usuario.id,
    data
  );
  const { lembrete, dispensar } = useLembretesHabitos(pagina);
  const futuro = data > (pagina?.hoje ?? dataSaoPaulo());
  const dias = diasDaSemana(data);

  useEffect(() => {
    const verificarDia = () => {
      const hoje = dataSaoPaulo();
      const anterior = hojeRef.current;
      if (hoje !== anterior) {
        setData((selecionada) => (selecionada === anterior ? hoje : selecionada));
        hojeRef.current = hoje;
      }
    };
    const intervalo = window.setInterval(verificarDia, 60_000);
    window.addEventListener("focus", verificarDia);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", verificarDia);
    };
  }, []);

  function abrirDetalhe(habito: Habito, iniciar = false) {
    setDetalhe({ habito, iniciar });
  }

  if (formulario)
    return (
      <div className="pagina habitos-pagina">
        <HabitoForm
          {...(formulario === "novo" ? {} : { habito: formulario })}
          salvando={salvando}
          onCancelar={() => setFormulario(null)}
          onSalvar={async (dados) => {
            await salvarConfiguracao(dados, formulario === "novo" ? undefined : formulario.id);
            setData(dataSaoPaulo());
            setFormulario(null);
          }}
        />
      </div>
    );

  return (
    <div className="pagina habitos-pagina">
      <header className="habitos-cabecalho">
        <div>
          <h1>Meus Hábitos</h1>
          <p>Acompanhe seu ritmo e cuide da sua rotina.</p>
        </div>
        <div className="habitos-cabecalho-acoes">
          <label className="habitos-data">
            <span>Data dos hábitos</span>
            <input
              type="date"
              value={data}
              min="2000-01-01"
              max="2100-12-31"
              onChange={(evento) => {
                if (evento.target.value && evento.target.validity.valid) setData(evento.target.value);
              }}
              disabled={salvando}
            />
          </label>
          <button
            type="button"
            className="botao-primario"
            onClick={() => setFormulario("novo")}
            disabled={salvando || (pagina?.totalCadastrados ?? 0) >= 30}
          >
            ＋ Novo hábito
          </button>
        </div>
      </header>
      <nav className="habitos-semana" aria-label="Dias da semana">
        {dias.map((dia) => (
          <button
            key={dia}
            type="button"
            aria-label={formatarDia(dia, { weekday: "long", day: "numeric", month: "long" })}
            aria-pressed={dia === data}
            className={dia === data ? "selecionado" : ""}
            disabled={salvando}
            onClick={() => setData(dia)}
          >
            <span>{formatarDia(dia, { weekday: "short" }).replace(".", "")}</span>
            <strong>{Number(dia.slice(8))}</strong>
          </button>
        ))}
      </nav>
      {lembrete && (
        <div className="habito-lembrete-aviso" role="status">
          <p>{lembrete}</p>
          <button type="button" className="habitos-link" onClick={dispensar} aria-label="Dispensar lembrete">
            ×
          </button>
        </div>
      )}
      {carregando ? (
        <div className="habitos-carregando" role="status">
          Carregando seus hábitos…
        </div>
      ) : erro && (!pagina || pagina.data !== data) ? (
        <section className="painel habitos-vazio" role="alert">
          <h2>Não foi possível carregar seus hábitos</h2>
          <p>{erro}</p>
          <button type="button" className="botao-primario" onClick={() => void carregar()}>
            Tentar novamente
          </button>
        </section>
      ) : (
        pagina && (
          <>
            <div className="habitos-resumos">
              <section className="habitos-hoje">
                <div>
                  <h2>{data === pagina.hoje ? "Hoje" : formatarDia(data, { day: "numeric", month: "long" })}</h2>
                  <p>
                    {pagina.resumo.feitos} de {pagina.resumo.total} hábitos
                    {pagina.resumo.pausados ? ` · ${pagina.resumo.pausados} em pausa` : ""}
                  </p>
                </div>
                <span>{pagina.resumo.feitos ? "Seu ritmo está indo bem" : "Um pequeno passo já é um começo"}</span>
                <ProgressBar
                  valor={pagina.resumo.feitos}
                  maximo={pagina.resumo.total}
                  descricao="Progresso dos hábitos do dia"
                />
              </section>
              <section className="habitos-ritmo">
                <span className="habitos-ritmo-icone" aria-hidden="true">
                  ▥
                </span>
                <div>
                  <strong>
                    {pagina.resumo.sequencia} {pagina.resumo.sequencia === 1 ? "dia" : "dias"} de ritmo
                  </strong>
                  <p>
                    {pagina.resumo.sequencia ? "Cada momento de cuidado conta." : "Respeite seu ritmo para começar."}
                  </p>
                </div>
                <span className="habitos-percentual">
                  <strong>{pagina.resumo.semana}%</strong>
                  <small>nos últimos 7 dias</small>
                </span>
              </section>
            </div>
            <div className="habitos-body-grid">
              <section className="painel habitos-lista-painel">
                <h2>{data === pagina.hoje ? "Hábitos de hoje" : "Hábitos do dia"}</h2>
                {pagina.habitos.length ? (
                  <div className="habitos-lista">
                    {pagina.habitos.map((habito) => (
                      <HabitoCard
                        key={habito.id}
                        habito={habito}
                        futuro={futuro}
                        salvando={salvando}
                        onDetalhe={abrirDetalhe}
                        onProgresso={(atual, valor) => {
                          void registrar(atual.id, { data, valor, pausado: false }).catch(() => {});
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="habitos-vazio">
                    <h3>
                      {pagina.totalCadastrados ? "Um dia para respeitar seu ritmo" : "Comece com um hábito possível"}
                    </h3>
                    <p>
                      {pagina.totalCadastrados
                        ? "Não há hábitos programados para esta data. Consulte outro dia ou crie uma nova meta."
                        : "Escolha uma pequena ação para cuidar da sua rotina."}
                    </p>
                    <button type="button" className="botao-primario" onClick={() => setFormulario("novo")}>
                      {pagina.totalCadastrados ? "Novo hábito" : "Criar primeiro hábito"}
                    </button>
                  </div>
                )}
              </section>
              <aside className="habitos-apoio">
                <section className="habito-insight">
                  <span className="habitos-insight-icone" aria-hidden="true">
                    ☀
                  </span>
                  <div>
                    <h2>Seu ritmo</h2>
                    <p>{pagina.resumo.insight}</p>
                  </div>
                </section>
                <section className="painel habitos-resumo-semanal">
                  <h2>Últimos 7 dias</h2>
                  <GraficoHabitos
                    dias={pagina.resumo.historico.map((dia) => ({
                      data: dia.data,
                      valor: dia.feitos,
                      meta: dia.total
                    }))}
                    descricao="Hábitos concluídos nos últimos sete dias"
                  />
                </section>
                <section className="painel habitos-proximo-lembrete">
                  <span aria-hidden="true">◷</span>
                  <div>
                    <h3>Próximo lembrete</h3>
                    {pagina.proximoLembrete ? (
                      <button
                        type="button"
                        className="habitos-link"
                        onClick={() => {
                          const habito = pagina.habitos.find((item) => item.id === pagina.proximoLembrete?.id);
                          if (habito) abrirDetalhe(habito);
                        }}
                      >
                        <strong>{pagina.proximoLembrete.nome}</strong>
                        <small>às {pagina.proximoLembrete.horario}</small>
                      </button>
                    ) : (
                      <p>Nenhum lembrete previsto para hoje.</p>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </>
        )
      )}
      {erro && pagina?.data === data && (
        <p className="feedback erro" role="alert">
          {erro}
        </p>
      )}
      {mensagem && (
        <p className="feedback sucesso" role="status">
          {mensagem}
        </p>
      )}
      {detalhe && (
        <HabitoDetalhes
          key={`${detalhe.habito.id}-${data}`}
          usuarioId={usuario.id}
          habito={detalhe.habito}
          data={data}
          futuro={futuro}
          iniciar={detalhe.iniciar}
          salvando={salvando}
          onFechar={() => setDetalhe(null)}
          onEditar={(habito) => {
            setDetalhe(null);
            setFormulario(habito);
          }}
          onSalvar={registrar}
          onExcluir={excluir}
        />
      )}
    </div>
  );
}
