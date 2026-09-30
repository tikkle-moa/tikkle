import { useConcerts } from "@entities/concert";
import { USER_ROLE, useSessionStore } from "@entities/session";

import { useConcertListFilterSearchParams } from "./use-concert-list-filter-search-params";
import { useMobileConcertListFilterToggle } from "./use-mobile-concert-list-filter-toggle";

export const useConcertList = () => {
  const user = useSessionStore((state) => state.user);
  const filter = useConcertListFilterSearchParams();
  const mobileFilter = useMobileConcertListFilterToggle();
  const { data: concerts = [], isPending, isError } = useConcerts();

  return {
    isAdmin: user?.role === USER_ROLE.ADMIN,
    concerts,
    isPending,
    isError,
    filter,
    mobileFilter,
  };
};
