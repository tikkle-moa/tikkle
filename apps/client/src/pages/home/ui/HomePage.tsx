import { useOutletContext } from "react-router";

import { Hero } from "@widgets/hero";

import type { AppLayoutOutletContext } from "@app/model/app-layout-outlet-context.types";

import DailyRanking from "./DailyRanking";
import HotConcert from "./HotConcert";
import UpcomingConcert from "./UpcomingConcert";

const HomePage = () => {
  const { categoryRef } = useOutletContext<AppLayoutOutletContext>();

  return (
    <div className="bg-white">
      <Hero categoryRef={categoryRef} />

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <section>
          <UpcomingConcert />
        </section>

        <section>
          <DailyRanking />
        </section>

        <section>
          <HotConcert />
        </section>
      </div>
    </div>
  );
};

export default HomePage;
