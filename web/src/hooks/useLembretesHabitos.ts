import { useEffect, useRef, useState } from "react";
import { lembretesDoMomento } from "../services/lembretes-habitos";
import type { PaginaHabitos } from "../types/habitos";

export function useLembretesHabitos(pagina: PaginaHabitos | null) {
  const exibidos = useRef(new Set<string>());
  const [lembrete, setLembrete] = useState("");
  useEffect(() => {
    const verificar = () => {
      const novos = lembretesDoMomento(pagina).filter((item) => !exibidos.current.has(item.chave));
      for (const item of novos) exibidos.current.add(item.chave);
      if (novos.length)
        setLembrete(`Um momento para você: ${novos.map((item) => item.nome).join(", ")}. Faça no seu ritmo.`);
    };
    const intervalo = window.setInterval(verificar, 15_000);
    window.addEventListener("focus", verificar);
    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", verificar);
    };
  }, [pagina]);
  return { lembrete, dispensar: () => setLembrete("") };
}
