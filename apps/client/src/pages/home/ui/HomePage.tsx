import { useOutletContext } from "react-router";

import type { AppLayoutOutletContext } from "@shared/model/outlet-context.types";

import { Hero } from "@widgets/hero";

import DailyRanking from "./DailyRanking";
import HotConcert from "./HotConcert";
import UpcomingConcert from "./UpcomingConcert";

const HomePage = () => {
  const { heroRef } = useOutletContext<AppLayoutOutletContext>();

  return (
    <div className="bg-white">
      <Hero heroRef={heroRef} />

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <section data-testid="upcoming-concert-section">
          <UpcomingConcert />
        </section>

        <section data-testid="daily-ranking-section">
          <DailyRanking />
        </section>

        <section data-testid="hot-concert-section">
          <HotConcert />
        </section>
      </div>
    </div>
  );
};

export default HomePage;
