import { Coffee, Droplet, Flower2, Footprints, Moon, Pencil } from "lucide-react";
import type { IconeHabito } from "../types/habitos";

const iconesHabito = {
  water: Droplet,
  coffee: Coffee,
  exercise: Footprints,
  sleep: Moon,
  meditation: Flower2,
  custom: Pencil
};

export function HabitoIcone({ icone }: { icone: IconeHabito }) {
  const Icone = iconesHabito[icone];

  return (
    <span className={`habito-icone ${icone}`} aria-hidden="true">
      <Icone size={24} strokeWidth={1.5} aria-hidden="true" focusable="false" />
    </span>
  );
}
