import { createBrowserRouter } from "react-router";

import { ROUTE_PATHS } from "@shared/config/router.config";

import { ConcertDetailPage } from "@pages/concert-detail";
import { ConcertEditPage } from "@pages/concert-edit";
import { ConcertListPage } from "@pages/concert-list";
import { ConcertNewPage } from "@pages/concert-new";
import { HomePage } from "@pages/home";
import { LoginPage } from "@pages/login";
import { FavoritePage, MyPage, ReservationPage } from "@pages/my";
import { PerformanceDetailPage } from "@pages/performance-detail";
import { PerformanceNewPage } from "@pages/performance-new";
import { SearchPage } from "@pages/search";

import AdminGuard from "./AdminGuard";
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
          { path: ROUTE_PATHS.CONCERT_LIST, element: <ConcertListPage /> },
          { path: ROUTE_PATHS.CONCERT_DETAIL, element: <ConcertDetailPage /> },
          { path: ROUTE_PATHS.PERFORMANCE_DETAIL, element: <PerformanceDetailPage /> },
          {
            element: <AdminGuard />,
            children: [
              { path: ROUTE_PATHS.CONCERT_NEW, element: <ConcertNewPage /> },
              { path: ROUTE_PATHS.CONCERT_EDIT, element: <ConcertEditPage /> },
              { path: ROUTE_PATHS.PERFORMANCE_NEW, element: <PerformanceNewPage /> },
            ],
          },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: ROUTE_PATHS.SEARCH, element: <SearchPage /> },
          { path: ROUTE_PATHS.MY, element: <MyPage /> },
          {
            element: <AuthGuard />,
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
