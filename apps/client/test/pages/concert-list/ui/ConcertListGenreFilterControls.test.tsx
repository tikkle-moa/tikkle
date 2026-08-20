import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CONCERT_GENRE_MAP } from "@entities/concert";

import ConcertListGenreFilterControls from "@pages/concertList/ui/ConcertListGenreFilterControls";

describe("ConcertListGenreFilterControls", () => {
  it("모든 장르 선택 버튼을 렌더링한다", () => {
    render(<ConcertListGenreFilterControls selectedGenres={[]} onToggleGenre={vi.fn()} />);

    for (const { label } of Object.values(CONCERT_GENRE_MAP)) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("선택된 장르를 aria-pressed 상태로 표시한다", () => {
    render(<ConcertListGenreFilterControls selectedGenres={["BALLAD"]} onToggleGenre={vi.fn()} />);

    expect(screen.getByRole("button", { name: "발라드" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "락/메탈" })).toHaveAttribute("aria-pressed", "false");
  });

  it("장르 버튼 클릭을 onToggleGenre에 위임한다", async () => {
    const user = userEvent.setup();
    const onToggleGenre = vi.fn();

    render(<ConcertListGenreFilterControls selectedGenres={[]} onToggleGenre={onToggleGenre} />);

    await user.click(screen.getByRole("button", { name: "발라드" }));

    expect(onToggleGenre).toHaveBeenCalledWith("BALLAD");
  });
});
