// Canonical accent colour per resource type (hex).
// MapView converts these to RGB tuples for deck.gl; ResourceFilterPanel uses hex directly.
// Add a new entry here when a new resource type is introduced.
export const RESOURCE_COLORS: Record<string, string> = {
  lng: '#00bfff',
  'iron-ore': '#ff8c00',
};

export function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
