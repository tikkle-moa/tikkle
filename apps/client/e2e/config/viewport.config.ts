const BREAKPOINTS = ["SM", "MD", "LG"] as const;
type Breakpoint = (typeof BREAKPOINTS)[number];
export type BreakpointBoundary = Breakpoint | `${Breakpoint}_BEFORE`;

interface ViewportConfig {
  label: string;
  width: number;
  height: number;
}

const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = { SM: 640, MD: 768, LG: 1024 };
export const BREAKPOINT_VIEWPORT_CONFIG = Object.fromEntries(
  BREAKPOINTS.flatMap((breakpoint) => {
    const breakpointWidth = BREAKPOINT_WIDTHS[breakpoint];
    return [
      [`${breakpoint}_BEFORE`, { label: `${breakpoint} 직전`, width: breakpointWidth - 1, height: 800 }],
      [breakpoint, { label: `${breakpoint} 경계`, width: breakpointWidth, height: 800 }],
    ] as const;
  }),
) as Record<BreakpointBoundary, ViewportConfig>;
