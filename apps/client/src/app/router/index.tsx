import { createBrowserRouter } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertListPage } from "@pages/concertList";
import { HomePage } from "@pages/home";
import { LoginPage } from "@pages/login";
import { FavoritePage, MyPage, ReservationPage } from "@pages/my";
import { SearchPage } from "@pages/search";

import AppLayout from "./AppLayout";
import AuthGuard from "./AuthGuard";
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
        element: <AppLayout showSecondaryHeader />,
        children: [
          { path: ROUTE_PATHS.HOME, element: <HomePage /> },
          { path: ROUTE_PATHS.CONCERTS, element: <ConcertListPage /> },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: ROUTE_PATHS.SEARCH, element: <SearchPage /> },
          { path: ROUTE_PATHS.MY, element: <MyPage /> },
        ],
      },
      {
        element: <AuthGuard />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTE_PATHS.MY_FAVORITES, element: <FavoritePage /> },
              { path: ROUTE_PATHS.MY_RESERVATIONS, element: <ReservationPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
