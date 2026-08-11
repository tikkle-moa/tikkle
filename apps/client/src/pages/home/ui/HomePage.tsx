import { Hero } from "@widgets/hero";

import DailyRanking from "./DailyRanking";
import HotConcert from "./HotConcert";
import UpcomingConcert from "./UpcomingConcert";

const HomePage = () => (
  <div className="bg-white">
    <Hero />

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

export default HomePage;
