import { Link } from "react-router";

import { ROUTE_PATHS } from "../../../shared/config/router.config";
import { useCount } from "../model/use-count";

const HomePage = () => {
  const { count, increment, decrement } = useCount();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-red-100">
      <h1 className="text-4xl font-bold text-gray-800">Welcome to Tikkle!</h1>
      <p className="mt-4 text-2xl">Count: {count}</p>
      <div className="mt-4">
        <button className="mr-2 rounded bg-blue-500 px-4 py-2 text-white" onClick={increment}>
          Increment
        </button>
        <button className="rounded bg-red-500 px-4 py-2 text-white" onClick={decrement}>
          Decrement
        </button>
      </div>
      <div className="mt-6">
        <Link
          className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          to={ROUTE_PATHS.LOGIN}
        >
          로그인
        </Link>
      </div>
      <a href="https://www.youtube.com" className="mt-6 text-blue-600 underline">
        Watch on YouTube
      </a>
    </div>
  );
};

export default HomePage;
