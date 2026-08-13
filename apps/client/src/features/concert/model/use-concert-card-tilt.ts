import { type PointerEvent, useRef, useState } from "react";

import type { Glare, Tilt } from "./concert-card.types";

interface UseConcertCardTiltProps {
  maxTilt: number;
  shadowOffset: number;
}

export const useConcertCardTilt = ({ maxTilt, shadowOffset }: UseConcertCardTiltProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState<Tilt>({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState<Glare>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    const card = cardRef.current;
    if (!card) return;

    const { left, top, width, height } = card.getBoundingClientRect();

    const x = event.clientX - left;
    const y = event.clientY - top;

    const rotateY = ((x - width / 2) / (width / 2)) * maxTilt;
    const rotateX = -((y - height / 2) / (height / 2)) * maxTilt;

    setTilt({ rotateX, rotateY });
    setGlare({ x: (x / width) * 100, y: (y / height) * 100 });
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlare({ x: 50, y: 50 });
  };

  const shadowX = (tilt.rotateY / maxTilt) * shadowOffset;
  const shadowY = (-tilt.rotateX / maxTilt) * shadowOffset + (isHovered ? 14 : 6);

  const outerShadow = isHovered
    ? `${shadowX}px ${shadowY}px 40px rgba(100, 50, 180, 0.22), ${shadowX * 0.4}px ${shadowY * 0.5 + 4}px 60px rgba(0, 0, 0, 0.14)`
    : "0 6px 20px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.07)";

  return {
    cardRef,
    tilt,
    glare,
    isHovered,
    outerShadow,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
  };
};
