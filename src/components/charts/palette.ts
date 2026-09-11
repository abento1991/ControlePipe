/** Chart palette derived from the Leto identity: greens first, then sober complementary tones. */
export const CHART_COLORS = ["#9cc45a", "#587f28", "#3b6b8f", "#8f5a3b", "#6b4f8f", "#c99a3b", "#2f6b5a", "#9a4b4b", "#7c8aa0", "#4a6f8f", "#8a7a2f", "#d1b25a", "#5aa88a", "#8f3b7a"];
export const LETO_GREEN = "#9cc45a";
export const LETO_GREEN_DEEP = "#587f28";
export const LETO_INK = "#0f1411";
export const GRID = "#e2e5dc";
export const AXIS = "#6b7266";
export function colorAt(i: number) {
  return CHART_COLORS[i % CHART_COLORS.length];
}
