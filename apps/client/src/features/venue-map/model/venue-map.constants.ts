const GOLDEN_ANGLE = 137.508;

const createSeededRandom = (seed: number) => {
  let state = seed || 1;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;

    return (state >>> 0) / 2 ** 32;
  };
};

export const createSectionColorMap = (venueId: number, sectionNames: string[]) => {
  const random = createSeededRandom(venueId);
  const hueOffset = Math.floor(random() * 360);

  return Object.fromEntries(
    [...sectionNames]
      .sort((first, second) => first.localeCompare(second, "ko"))
      .map((sectionName, index) => [sectionName, `hsl(${(hueOffset + index * GOLDEN_ANGLE) % 360} 68% 52%)`]),
  ) as Record<string, string>;
};
