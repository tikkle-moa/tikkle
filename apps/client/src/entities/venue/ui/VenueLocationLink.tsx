import type { ReactNode } from "react";

import { MapPinned } from "lucide-react";

interface VenueLocationLinkProps {
  searchText: string;
  label?: string;
  children: ReactNode;
  variant?: "light" | "dark";
  className?: string;
}

const VenueLocationLink = ({ searchText, label = searchText, children, variant = "light", className = "" }: VenueLocationLinkProps) => {
  const colorClassName =
    variant === "dark"
      ? "text-violet-100 hover:text-white focus-visible:text-white"
      : "text-slate-600 hover:text-violet-600 focus-visible:text-violet-600";
  const alignmentClassName = variant === "dark" ? "items-start" : "items-center";

  return (
    <a
      href={`https://map.naver.com/p/search/${encodeURIComponent(searchText)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} 네이버 지도로 보기, 새 탭`}
      className={`group/location pointer-events-auto relative z-10 inline-flex max-w-full ${alignmentClassName} gap-1.5 text-sm transition-colors hover:underline focus-visible:underline ${colorClassName} ${className}`}
    >
      <MapPinned className={`${variant === "dark" ? "mt-0.5" : ""} size-4 shrink-0 ${variant === "light" ? "text-violet-500" : ""}`} aria-hidden />
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-0 hidden -translate-y-1 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition-all group-hover/location:block group-hover/location:translate-y-0 group-hover/location:opacity-100 group-focus-visible/location:block group-focus-visible/location:translate-y-0 group-focus-visible/location:opacity-100 sm:block"
      >
        네이버 지도로 보기
      </span>
    </a>
  );
};

export default VenueLocationLink;
