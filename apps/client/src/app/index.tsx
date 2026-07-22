import { RouterProvider, createBrowserRouter } from "react-router";

import Layout from "./router/Layout";
import "./styles/global.css";
import "./styles/tailwind.css";

import { ConcertListPage } from "../pages/concertList";
import { HomePage } from "../pages/home";
import { ROUTE_PATHS } from "../shared/config/router.config";

const App = () => {
  const router = createBrowserRouter([
    {
      element: <Layout />,
      children: [
        {
          path: ROUTE_PATHS.HOME,
          element: <HomePage />,
        },
        {
          path: ROUTE_PATHS.CONCERTS,
          element: <ConcertListPage />,
        },
      ],
    },
  ]);
  return <RouterProvider router={router} />;
};

export default App;
