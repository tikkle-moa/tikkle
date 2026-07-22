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
      <a href="https://www.youtube.com" className="mt-6 text-blue-600 underline">
        Watch on YouTube
      </a>
    </div>
  );
};

export default HomePage;
