import { RECOMMENDED_KEYWORDS } from "../model/search.constants";

const SearchSuggestions = () => (
  <>
    <section aria-labelledby="recommended-keywords">
      <h2 id="recommended-keywords" className="text-base font-semibold text-gray-900">
        추천 검색어
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {RECOMMENDED_KEYWORDS.map((keyword) => (
          <button
            key={keyword}
            className="hover:border-brand-primary hover:text-brand-primary rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors"
            type="button"
          >
            {keyword}
          </button>
        ))}
      </div>
    </section>

    <section className="mt-10" aria-labelledby="popular-concerts">
      <h2 id="popular-concerts" className="text-base font-semibold text-gray-900">
        인기 공연
      </h2>
      <p className="mt-3 text-sm text-gray-500">인기 공연을 준비하고 있습니다.</p>
    </section>
  </>
);

export default SearchSuggestions;
