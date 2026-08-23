import type { components } from "@tikkle/api-types";

import type { PerformanceResponse } from "@entities/performance";

export interface ConcertDetailResponse {
  concert: components["schemas"]["ConcertResponse"];
  performances: PerformanceResponse[];
}
