import { Search } from "lucide-react";

import SearchSuggestions from "./SearchSuggestions";

const SearchContent = () => (
  <>
    <form>
      <label className="sr-only" htmlFor="concert-search">
        공연 검색
      </label>
      <div className="flex items-center gap-3 rounded-xl bg-gray-100 px-4 py-3">
        <Search aria-hidden="true" className="text-gray-500" size={20} />
        <input
          autoFocus
          className="min-w-0 grow bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
          id="concert-search"
          placeholder="공연명, 아티스트, 장소를 검색해 보세요"
          type="search"
        />
      </div>
    </form>

    <div className="mt-8">
      <SearchSuggestions />
    </div>
  </>
);

export default SearchContent;
