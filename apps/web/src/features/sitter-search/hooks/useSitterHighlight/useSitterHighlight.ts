import { useState } from "react";
import { sitterRowId } from "../../utils/sitter-row-id/sitter-row-id";

/**
 * Links the list and the map: the sitter picked on the map (highlighted and
 * scrolled to in the list) and the sitter under the mouse in the list
 * (highlighted on the map).
 */
export function useSitterHighlight() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  function selectSitter(id: number) {
    setSelectedId(id);
    const card = document.getElementById(sitterRowId(id));
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
    card?.focus({ preventScroll: true });
  }

  return { selectedId, hoveredId, selectSitter, setHoveredId };
}
