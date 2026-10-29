// Stand-in for the Leaflet map in UI tests: one button per pin.

import type { SitterResult } from "@sitter/domain/contract";

/** Set `crash` to make the map throw while rendering, to test its error boundary. */
export const fakeMap = { crash: false };

type Props = {
  results: SitterResult[];
  onSelectSitter: (id: number) => void;
  onPick: (lat: number, lng: number) => void;
};

/** One button per pin, plus a button that clicks the map at 48.9, 2.3. */
export function SitterMap({ results, onSelectSitter, onPick }: Props) {
  if (fakeMap.crash) throw new Error("Leaflet failed to start");
  return (
    <>
      {results.map((sitter, index) => (
        <button key={sitter.id} type="button" onClick={() => onSelectSitter(sitter.id)}>
          Pin {index + 1}
        </button>
      ))}
      <button type="button" onClick={() => onPick(48.9, 2.3)}>
        Click the map
      </button>
    </>
  );
}
