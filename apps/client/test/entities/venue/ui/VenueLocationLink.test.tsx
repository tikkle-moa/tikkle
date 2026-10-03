import { render, screen } from "@testing-library/react";

import VenueLocationLink from "@entities/venue/ui/VenueLocationLink";

describe("VenueLocationLink", () => {
  it("공연장 이름을 표시하고 실제 주소로 네이버 지도 검색 링크를 만든다", () => {
    const venueName = "올림픽공원 KSPO DOME";
    const venueAddress = "서울특별시 송파구 올림픽로 424";

    render(
      <VenueLocationLink searchText={venueAddress} label={venueName}>
        {venueName}
      </VenueLocationLink>,
    );

    const link = screen.getByRole("link", { name: `${venueName} 네이버 지도로 보기, 새 탭` });

    expect(link).toHaveTextContent(venueName);
    expect(link).toHaveAttribute("href", `https://map.naver.com/p/search/${encodeURIComponent(venueAddress)}`);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.querySelector('[role="tooltip"]')).toHaveTextContent("네이버 지도로 보기");
  });

  it("표시명이 없으면 검색 주소를 라벨로 사용하고 어두운 스타일을 적용한다", () => {
    const venueAddress = "서울특별시 송파구 올림픽로 424";

    render(
      <VenueLocationLink searchText={venueAddress} variant="dark">
        {venueAddress}
      </VenueLocationLink>,
    );

    const link = screen.getByRole("link", { name: `${venueAddress} 네이버 지도로 보기, 새 탭` });
    const icon = link.querySelector("svg");

    expect(link).toHaveClass("items-start", "text-violet-100");
    expect(link).not.toHaveClass("items-center", "text-slate-600");
    expect(icon).toHaveClass("mt-0.5", "size-4", "shrink-0");
    expect(icon).not.toHaveClass("text-violet-500");
  });
});
