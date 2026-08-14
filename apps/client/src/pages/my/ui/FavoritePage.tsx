import { useNavigate } from "react-router";

import { ChevronLeft } from "lucide-react";

const FavoritePage = () => {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="favorite-page-title" className="mx-auto max-w-screen-sm py-2">
      <button
        aria-label="이전 페이지로 돌아가기"
        className="flex size-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
        type="button"
        onClick={() => navigate(-1)}
      >
        <ChevronLeft aria-hidden="true" size={24} />
      </button>

      <h1 id="favorite-page-title" className="mt-4 text-2xl font-bold text-gray-900">
        관심
      </h1>
      <p className="mt-2 text-sm text-gray-600">관심 공연 목록을 준비하고 있어요.</p>
    </section>
  );
};

export default FavoritePage;
