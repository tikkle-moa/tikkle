import { SECTION_COLOR_LIGHTNESS, SECTION_COLOR_SATURATION } from "./venue-map.constants";

const createSectionColorSeed = (venueId: number, sectionName: string) => {
  let hash = 2_166_136_261;
  const value = `${venueId}:${sectionName}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
};

export const createSectionColorMap = (venueId: number, sectionNames: string[]) =>
  Object.fromEntries(
    sectionNames.map((sectionName) => {
      const hue = createSectionColorSeed(venueId, sectionName) % 360;

      return [sectionName, `hsl(${hue} ${SECTION_COLOR_SATURATION}% ${SECTION_COLOR_LIGHTNESS}%)`];
    }),
  ) as Record<string, string>;
