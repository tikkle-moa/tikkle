import { createBrowserRouter } from "react-router";

import Layout from "./Layout";

import { ConcertListPage } from "../../pages/concertList";
import { HomePage } from "../../pages/home";
import { LoginPage } from "../../pages/login";
import { OAuthSuccessPage } from "../../pages/oauthSuccess";
import { ROUTE_PATHS } from "../../shared/config/router.config";

export const router = createBrowserRouter([
  {
    path: ROUTE_PATHS.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTE_PATHS.OAUTH_SUCCESS,
    element: <OAuthSuccessPage />,
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
