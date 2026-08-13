import type { paths } from "@tikkle/api-types";
import createClient from "openapi-fetch";

import { camelCaseMiddleware } from "./camel-case-middleware";
import { csrfMiddleware } from "./csrf-middleware";

export const apiClient = createClient<paths>({
  baseUrl: "",
  credentials: "include",
});

apiClient.use(csrfMiddleware);
apiClient.use(camelCaseMiddleware);
