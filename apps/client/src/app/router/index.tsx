import { createBrowserRouter } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertListPage } from "@pages/concertList";
import { HomePage } from "@pages/home";
import { LoginPage } from "@pages/login";

import GuestGuard from "./GuestGuard";
import Layout from "./Layout";

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      {
        path: ROUTE_PATHS.LOGIN,
        element: <LoginPage />,
      },
    ],
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
