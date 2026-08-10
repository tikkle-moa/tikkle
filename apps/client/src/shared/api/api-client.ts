import type { paths } from "@tikkle/api-types";
import createClient from "openapi-fetch";

import { csrfMiddleware } from "./csrf-middleware";
import { refreshTokenMiddleware } from "./refresh-token-middleware";

export const apiClient = createClient<paths>({
  baseUrl: "",
  credentials: "include",
});

apiClient.use(refreshTokenMiddleware);
apiClient.use(csrfMiddleware);
