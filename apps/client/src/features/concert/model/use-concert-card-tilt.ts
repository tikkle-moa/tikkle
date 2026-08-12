import { type MouseEvent, useRef, useState } from "react";

import { MAX_TILT, SHADOW_OFFSET } from "./concert-card.constants";

export const useConcertCardTilt = () => {
  const cardRef = useRef<HTMLDivElement>(null);

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const { left, top, width, height } = card.getBoundingClientRect();

    const x = event.clientX - left;
    const y = event.clientY - top;

    const rotateY = ((x - width / 2) / (width / 2)) * MAX_TILT;
    const rotateX = -((y - height / 2) / (height / 2)) * MAX_TILT;

    setTilt({ rotateX, rotateY });
    setGlare({ x: (x / width) * 100, y: (y / height) * 100 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const shadowX = (tilt.rotateY / MAX_TILT) * SHADOW_OFFSET;
  const shadowY = (-tilt.rotateX / MAX_TILT) * SHADOW_OFFSET + (isHovered ? 14 : 6);

  const outerShadow = isHovered
    ? `${shadowX}px ${shadowY}px 40px rgba(100, 50, 180, 0.22), ${shadowX * 0.4}px ${shadowY * 0.5 + 4}px 60px rgba(0, 0, 0, 0.14)`
    : "0 6px 20px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.07)";

  return {
    cardRef,
    tilt,
    glare,
    isHovered,
    outerShadow,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  };
};
