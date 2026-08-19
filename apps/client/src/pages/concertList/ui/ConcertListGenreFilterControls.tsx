import { CONCERT_GENRE_MAP } from "@entities/concert";

const ConcertListGenreFilterControls = () => {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CONCERT_GENRE_MAP).map(([genre, { label }]) => (
        <button
          key={genre}
          type="button"
          disabled
          className="rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 disabled:cursor-not-allowed"
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default ConcertListGenreFilterControls;
