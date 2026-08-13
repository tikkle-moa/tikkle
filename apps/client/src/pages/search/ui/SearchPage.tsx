import { SearchContent } from "@features/concert-search";

const SearchPage = () => (
  <section className="mx-auto w-full max-w-screen-sm">
    <h1 className="text-xl font-bold text-gray-900">검색</h1>
    <div className="mt-5">
      <SearchContent />
    </div>
  </section>
);

export default SearchPage;
