// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SitterMap } from "./SitterMap";

const leaflet = vi.hoisted(() => {
  const map = { setView: vi.fn().mockReturnThis(), panTo: vi.fn(), invalidateSize: vi.fn(), on: vi.fn(), remove: vi.fn() };
  const layer = { addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn() };
  return { map: vi.fn(() => map), layerGroup: vi.fn(() => layer), tileLayer: vi.fn(() => ({ addTo: vi.fn() })), circleMarker: vi.fn(() => ({ bindTooltip: vi.fn().mockReturnThis(), addTo: vi.fn() })), instance: map };
});
vi.mock("leaflet", () => ({ default: leaflet }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("starts at the search location and recenters only on location changes, preserving zoom and user panning", () => {
  let resized = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resized = callback; }
    observe = vi.fn(); disconnect = disconnect;
  });
  const props = { lat: 23.8103, lng: 90.4125, results: [], selectedId: null, hoveredId: null, onPick: vi.fn(), onSelectSitter: vi.fn() };
  const view = render(<SitterMap {...props} />);
  expect(leaflet.instance.setView).toHaveBeenCalledWith([23.8103, 90.4125], 12);
  leaflet.instance.panTo.mockClear();
  view.rerender(<SitterMap {...props} hoveredId={42} />);
  expect(leaflet.instance.panTo).not.toHaveBeenCalled();
  view.rerender(<SitterMap {...props} lat={48.8566} lng={2.3522} />);
  expect(leaflet.instance.panTo).toHaveBeenCalledExactlyOnceWith([48.8566, 2.3522], { animate: false });
  expect(leaflet.map).toHaveBeenCalledOnce();
  resized();
  expect(leaflet.instance.invalidateSize).toHaveBeenCalledWith({ pan: false });
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(leaflet.instance.remove).toHaveBeenCalledOnce();
});
