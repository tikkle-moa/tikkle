import { SECTION_COLORS } from "./venue-layout.constants";

export const getSectionColor = (sectionName: string) => {
  const hash = Array.from(sectionName || "미지정").reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return SECTION_COLORS[hash % SECTION_COLORS.length];
};
