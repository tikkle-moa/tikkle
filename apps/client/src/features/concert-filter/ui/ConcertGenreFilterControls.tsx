import { CONCERT_GENRE_MAP } from "@entities/concert";

interface ConcertGenreFilterControlsProps {
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
}

const ConcertGenreFilterControls = ({ selectedGenres, onToggleGenre }: ConcertGenreFilterControlsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CONCERT_GENRE_MAP).map(([genre, { label }]) => {
        const isSelected = selectedGenres.includes(genre);

        return (
          <button
            key={genre}
            type="button"
            aria-pressed={isSelected}
            className={`flex h-8 items-center justify-center rounded-full border px-3 text-xs leading-none font-medium transition-colors ${
              isSelected ? "border-violet-600 bg-violet-600 text-white" : "border-violet-100 bg-white text-gray-600 hover:border-violet-300"
            }`}
            onClick={() => onToggleGenre(genre)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default ConcertGenreFilterControls;
