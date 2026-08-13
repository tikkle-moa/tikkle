import { Link } from "react-router";

import type { ConcertGenreItem } from "@entities/concert";

interface ConcertGenreLinkProps {
  config: ConcertGenreItem;
}

const ConcertGenreLink = ({ config }: ConcertGenreLinkProps) => {
  const { icon: Icon, label, className, to } = config;

  return (
    <Link to={to} className="group flex flex-col items-center gap-2 text-gray-600 transition-colors hover:text-violet-700">
      <div
        className={`flex size-12 items-center justify-center rounded-2xl transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-105 group-hover:shadow-md ${className}`}
      >
        <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" />
      </div>

      <span className="text-xs font-medium whitespace-nowrap transition-colors">{label}</span>
    </Link>
  );
};

export default ConcertGenreLink;
