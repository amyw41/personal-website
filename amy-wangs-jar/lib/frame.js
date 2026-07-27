// Horizontal positions in the footer/social column are percentages of a
// 1512px reference frame (the design's desktop canvas) so the layout scales
// proportionally at any viewport width instead of being pinned to literal px.
const FRAME_WIDTH = 1512;

export const pct = (x) => `${((x / FRAME_WIDTH) * 100).toFixed(3)}%`;
