export const getVenueStageCornerRadius = (stageWidth: number, stageHeight: number) => {
  return Math.min(stageWidth, stageHeight) * 0.25;
};

export const getVenueStageTitleFontSize = (stageWidth: number, stageHeight: number, title: string = "STAGE") => {
  const normalizedTitle = title.trim() || "STAGE";
  const heightBasedSize = stageHeight * 0.48;
  const widthBasedSize = stageWidth / (normalizedTitle.length * 0.75);

  return Math.min(heightBasedSize, widthBasedSize);
};
