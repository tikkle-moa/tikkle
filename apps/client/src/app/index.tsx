import { RouterProvider, createBrowserRouter } from "react-router";

import Layout from "./router/Layout";
import "./styles/global.css";
import "./styles/tailwind.css";

import { ConcertListPage } from "../pages/concertList";
import { HomePage } from "../pages/home";
import { LoginPage } from "../pages/login";
import { ROUTE_PATHS } from "../shared/config/router.config";

const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.LOGIN,
    element: <LoginPage />,
  },
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

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
