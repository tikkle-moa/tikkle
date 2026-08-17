export type Viewport = "MOBILE" | "SMALL_TABLET" | "TABLET" | "DESKTOP";

export interface ViewportConfig {
  label: string;
  width: number;
  height: number;
}

export const VIEWPORT_CONFIG: Record<Viewport, ViewportConfig> = {
  MOBILE: { label: "모바일", width: 400, height: 800 }, // width < sm(640)
  SMALL_TABLET: { label: "소형 태블릿", width: 700, height: 900 }, // sm(640) <= width < md(768)
  TABLET: { label: "태블릿", width: 900, height: 600 }, // md(768) <= width < lg(1024)
  DESKTOP: { label: "데스크톱", width: 1280, height: 800 }, // lg(1024) <= width
};
