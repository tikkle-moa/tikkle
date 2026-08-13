import { Search } from "lucide-react";

import { RECOMMENDED_KEYWORDS } from "../model/search.constants";

const SearchPage = () => (
  <section className="mx-auto w-full max-w-screen-sm">
    <h1 className="text-xl font-bold text-gray-900">검색</h1>

    <form className="mt-5">
      <label className="sr-only" htmlFor="concert-search">
        공연 검색
      </label>
      <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3">
        <Search aria-hidden="true" className="text-gray-500" size={20} />
        <input
          className="min-w-0 grow bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
          id="concert-search"
          placeholder="공연명, 아티스트, 장소를 검색해 보세요"
          type="search"
        />
      </div>
    </form>

    <section className="mt-8" aria-labelledby="recommended-keywords">
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
  </section>
);

export default SearchPage;
