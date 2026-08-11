import { createBrowserRouter } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertListPage } from "@pages/concertList";
import { HomePage } from "@pages/home";
import { LoginPage } from "@pages/login";

import AppLayout from "./AppLayout";
import GuestGuard from "./GuestGuard";
import RootLayout from "./RootLayout";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
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
        element: <AppLayout />,
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
    ],
  },
]);
