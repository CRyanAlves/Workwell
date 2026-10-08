import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError } from "../services/api";
import { categoriasHabito, configuracaoInicial, validarFormularioHabito } from "../services/habitos-form";
import type { ConfiguracaoHabito, Habito, IconeHabito } from "../types/habitos";
import { HabitoIcone } from "./HabitoIcone";
import { ProgressBar } from "./ProgressBar";

type HabitoFormProps = {
  habito?: Habito;
  onSalvar: (dados: ConfiguracaoHabito) => Promise<unknown>;
  onCancelar: () => void;
  salvando: boolean;
};
const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function HabitoForm({ habito, onSalvar, onCancelar, salvando }: HabitoFormProps) {
  const [dados, setDados] = useState(() => configuracaoInicial(habito));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const categoria = categoriasHabito.find((item) => item.icone === dados.icone)!;
  const erroCampo = (campo: string) =>
    erros[campo] ? (
      <small className="habito-erro-campo" id={`erro-${campo}`} role="alert">
        {erros[campo]}
      </small>
    ) : null;

  function alterar<K extends keyof ConfiguracaoHabito>(campo: K, valor: ConfiguracaoHabito[K]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: "" }));
  }

  function escolherCategoria(icone: IconeHabito) {
    const escolhida = categoriasHabito.find((item) => item.icone === icone)!;
    setDados((atual) => ({
      ...atual,
      icone,
      nome: !atual.nome || atual.nome === categoria.nome ? escolhida.nome : atual.nome,
      meta: escolhida.meta,
      unidade: escolhida.unidades[0]!
    }));
    setErros({});
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const falhas = validarFormularioHabito(dados);
    setErros(falhas);
    setErroGeral("");
    if (Object.keys(falhas).length) {
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(falhas)[0]}"]`)?.focus();
      return;
    }
    try {
      await onSalvar({ ...dados, nome: dados.nome.trim() });
    } catch (erro) {
      if (erro instanceof ApiRequestError)
        setErros(Object.fromEntries(erro.detalhes.map((detalhe) => [detalhe.campo.split(".")[0], detalhe.mensagem])));
      setErroGeral(erro instanceof Error ? erro.message : "Não foi possível salvar. Tente novamente.");
    }
  }

  return (
    <div className="habito-form-pagina">
      <button className="habitos-voltar" type="button" onClick={onCancelar} disabled={salvando}>
        ‹ Hábitos
      </button>
      <header className="habitos-cabecalho">
        <div>
          <h1>{habito ? "Editar hábito" : "Novo hábito"}</h1>
          <p>Escolha uma meta que combine com a sua rotina. Você poderá ajustar quando quiser.</p>
        </div>
      </header>
      <form className="habito-form-grid" onSubmit={salvar} noValidate ref={formRef}>
        <div className="habito-form-principal">
          <fieldset className="painel habito-categorias">
            <legend>O que você quer cuidar?</legend>
            <div>
              {categoriasHabito.map((item) => (
                <button
                  type="button"
                  key={item.icone}
                  className={dados.icone === item.icone ? "selecionado" : ""}
                  aria-pressed={dados.icone === item.icone}
                  onClick={() => escolherCategoria(item.icone)}
                  disabled={salvando}
                >
                  <HabitoIcone icone={item.icone} />
                  <span>{item.titulo}</span>
                  <span className="categoria-marca" aria-hidden="true">
                    {dados.icone === item.icone ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <section className="painel habito-form-detalhes">
            <h2>Detalhes do hábito</h2>
            <label htmlFor="habito-nome">Nome do hábito</label>
            <div className="habito-nome-campo">
              <input
                id="habito-nome"
                name="nome"
                maxLength={60}
                value={dados.nome}
                onChange={(evento) => alterar("nome", evento.target.value)}
                disabled={salvando}
                aria-invalid={!!erros.nome}
                aria-describedby={erros.nome ? "erro-nome" : undefined}
              />
              <button type="button" aria-label="Limpar nome" onClick={() => alterar("nome", "")} disabled={salvando}>
                ×
              </button>
            </div>
            {erroCampo("nome")}
            <div className="habito-form-linha">
              <label htmlFor="habito-meta">Meta</label>
              <div className="habito-meta-campos">
                <div className="habito-contador">
                  <button
                    type="button"
                    aria-label="Diminuir meta"
                    disabled={salvando || dados.meta <= 1}
                    onClick={() => alterar("meta", Math.max(1, dados.meta - 1))}
                  >
                    −
                  </button>
                  <input
                    id="habito-meta"
                    name="meta"
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    value={Number.isNaN(dados.meta) ? "" : dados.meta}
                    onChange={(evento) =>
                      alterar("meta", evento.target.value === "" ? NaN : Number(evento.target.value))
                    }
                    disabled={salvando}
                    aria-invalid={!!erros.meta}
                  />
                  <button
                    type="button"
                    aria-label="Aumentar meta"
                    disabled={salvando || dados.meta >= 1000}
                    onClick={() => alterar("meta", Math.min(1000, (dados.meta || 0) + 1))}
                  >
                    ＋
                  </button>
                </div>
                <select
                  name="unidade"
                  aria-label="Unidade da meta"
                  value={dados.unidade}
                  onChange={(evento) => alterar("unidade", evento.target.value)}
                  disabled={salvando}
                >
                  {categoria.unidades.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {erroCampo("meta")}
            {erroCampo("unidade")}
            <fieldset className="habito-frequencia">
              <legend>Frequência</legend>
              <div className="habito-segmentos">
                {(
                  [
                    { valor: "DIARIA", titulo: "Todos os dias" },
                    { valor: "DIAS_ESPECIFICOS", titulo: "Dias específicos" },
                    { valor: "SEMANAL", titulo: "Por semana" }
                  ] as const
                ).map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    name="frequencia"
                    aria-pressed={dados.frequencia === opcao.valor}
                    className={dados.frequencia === opcao.valor ? "selecionado" : ""}
                    onClick={() => {
                      alterar("frequencia", opcao.valor);
                      if (opcao.valor === "SEMANAL" && dados.quantidadeSemanal === null)
                        alterar("quantidadeSemanal", 3);
                    }}
                    disabled={salvando}
                  >
                    {opcao.titulo}
                  </button>
                ))}
              </div>
              {dados.frequencia === "DIAS_ESPECIFICOS" && (
                <div className="habito-dias-especificos">
                  {nomesDias.map((nome, dia) => (
                    <button
                      type="button"
                      name="diasSemana"
                      key={dia}
                      aria-pressed={dados.diasSemana.includes(dia)}
                      onClick={() =>
                        alterar(
                          "diasSemana",
                          dados.diasSemana.includes(dia)
                            ? dados.diasSemana.filter((item) => item !== dia)
                            : [...dados.diasSemana, dia].sort()
                        )
                      }
                      disabled={salvando}
                    >
                      {nome}
                    </button>
                  ))}
                </div>
              )}
              {dados.frequencia === "SEMANAL" && (
                <label className="habito-semanal-campo">
                  Dias por semana
                  <input
                    name="quantidadeSemanal"
                    type="number"
                    min={1}
                    max={7}
                    step={1}
                    value={dados.quantidadeSemanal ?? ""}
                    onChange={(evento) => alterar("quantidadeSemanal", Number(evento.target.value))}
                    disabled={salvando}
                  />
                </label>
              )}
              {erroCampo("frequencia")}
              {erroCampo("diasSemana")}
              {erroCampo("quantidadeSemanal")}
            </fieldset>
          </section>
          <section className="painel habito-form-lembretes">
            <div className="painel-titulo">
              <h2>Lembretes</h2>
              <button
                className="habito-switch"
                type="button"
                role="switch"
                aria-checked={dados.lembretesAtivos}
                aria-label="Ativar lembretes"
                onClick={() => alterar("lembretesAtivos", !dados.lembretesAtivos)}
                disabled={salvando}
              >
                <span />
              </button>
            </div>
            <div className={`habito-horarios${dados.lembretesAtivos ? "" : " desativados"}`}>
              {dados.horarios.map((horario, indice) => (
                <div key={indice}>
                  <input
                    type="time"
                    name="horarios"
                    aria-label={`Horário ${indice + 1}`}
                    value={horario}
                    onChange={(evento) =>
                      alterar(
                        "horarios",
                        dados.horarios.map((item, posicao) => (posicao === indice ? evento.target.value : item))
                      )
                    }
                    disabled={salvando}
                  />
                  <button
                    type="button"
                    aria-label={`Remover horário ${indice + 1}`}
                    onClick={() =>
                      alterar(
                        "horarios",
                        dados.horarios.filter((_, posicao) => posicao !== indice)
                      )
                    }
                    disabled={salvando}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="habito-horario-adicionar"
                type="button"
                disabled={salvando || dados.horarios.length >= 8}
                onClick={() => {
                  const horario =
                    Array.from({ length: 24 }, (_, hora) => `${String(hora).padStart(2, "0")}:00`).find(
                      (item) => !dados.horarios.includes(item)
                    ) ?? "";
                  alterar("horarios", [...dados.horarios, horario]);
                }}
              >
                ＋ Adicionar horário
              </button>
            </div>
            {erroCampo("horarios")}
            <label className="habito-permitir-pausa">
              <input
                type="checkbox"
                checked={dados.permitirPausa}
                onChange={(evento) => alterar("permitirPausa", evento.target.checked)}
                disabled={salvando}
              />
              <span>
                Permitir pausar em dias difíceis<small>Pausar não interrompe seu ritmo.</small>
              </span>
            </label>
          </section>
        </div>
        <aside className="habito-form-previa">
          <section className="painel">
            <h2>Prévia do hábito</h2>
            <div className="habito-previa-card">
              <HabitoIcone icone={dados.icone} />
              <div>
                <strong>{dados.nome.trim() || "Seu novo hábito"}</strong>
                <p>
                  0 de {dados.meta > 0 ? dados.meta : "—"} {dados.unidade}
                </p>
              </div>
              <strong>0%</strong>
              <ProgressBar valor={0} maximo={dados.meta} descricao="Prévia do progresso" />
            </div>
          </section>
          <section className="habito-insight">
            <h2>Você poderá editar sua meta a qualquer momento.</h2>
            <p>Se a sua rotina mudar, tudo bem! Ajuste a meta, os horários ou pause seu hábito quando precisar.</p>
          </section>
        </aside>
        {erroGeral && (
          <p className="feedback erro habito-form-feedback" role="alert">
            {erroGeral}
          </p>
        )}
        <footer className="habito-form-acoes">
          <button type="button" className="botao-secundario" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </button>
          <button className="botao-primario" type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : habito ? "Salvar alterações" : "Criar hábito"}
          </button>
        </footer>
      </form>
    </div>
  );
}
