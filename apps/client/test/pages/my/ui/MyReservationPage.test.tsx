import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MyReservation } from "@entities/reservation";

import MyReservationPage from "@pages/my/ui/MyReservationPage";

const { mockGet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
}));

vi.mock("@shared/api", () => ({
  apiClient: {
    GET: mockGet,
  },
}));

const statusCases: Array<readonly [MyReservation["status"], string]> = [
  ["PAYMENT_PENDING", "결제 대기"],
  ["PAYMENT_CONFIRMING", "결제 확인 중"],
  ["CANCELLATION_PENDING", "취소 처리 중"],
  ["REFUND_ACCOUNT_REQUIRED", "환불 계좌 입력 필요"],
  ["SUCCEEDED", "예매 완료"],
  ["FAILED", "예매 실패"],
  ["CANCELLED", "취소 완료"],
  ["EXPIRED", "예매 만료"],
  ["REFUND_REQUIRED", "환불 확인 필요"],
  ["REFUNDED", "환불 완료"],
];

const makeMyReservation = (overrides: Partial<MyReservation> = {}): MyReservation => ({
  id: 501,
  concertTitle: "콘서트 A",
  posterUrl: "https://example.com/poster.jpg",
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "공연장 A",
  seats: [
    { sectionName: "R석", seatLabel: "A-12" },
    { sectionName: "R석", seatLabel: "A-13" },
  ],
  amount: 132000,
  status: "SUCCEEDED",
  createdAt: "2026-09-30T12:00:00",
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyReservationPage />
    </QueryClientProvider>,
  );
};

describe("MyReservationPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("목록을 불러오는 중임을 표시한다", () => {
    mockGet.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByRole("heading", { name: "내 예약" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("예매 목록을 불러오는 중이에요.");
    expect(mockGet).toHaveBeenCalledWith("/api/reservations");
  });

  it("예매 내역이 없는 경우 빈 상태를 표시한다", async () => {
    mockGet.mockResolvedValue({
      data: { data: [] },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    renderPage();

    expect(await screen.findByText("예매 내역이 없어요.")).toBeInTheDocument();
  });

  it("오류 메시지를 표시하고 다시 시도할 수 있다", async () => {
    const user = userEvent.setup();
    const myReservation = makeMyReservation();
    mockGet
      .mockResolvedValueOnce({
        data: undefined,
        error: { message: "요청 실패" },
        response: { ok: false, status: 500 },
      })
      .mockResolvedValueOnce({
        data: { data: [myReservation] },
        error: undefined,
        response: { ok: true, status: 200 },
      });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("내 예매 목록을 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("heading", { name: myReservation.concertTitle })).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it("서버 순서로 요약을 표시하고 상태와 포스터를 렌더링한다", async () => {
    const myReservations = statusCases.map(([status], index) =>
      makeMyReservation({
        id: 501 - index,
        concertTitle: `콘서트 ${index + 1}`,
        posterUrl: index === 0 ? "https://example.com/poster.jpg" : null,
        status,
      }),
    );
    mockGet.mockResolvedValue({
      data: { data: myReservations },
      error: undefined,
      response: { ok: true, status: 200 },
    });

    const { container } = renderPage();

    const concertHeadings = await screen.findAllByRole("heading", { level: 2 });
    expect(concertHeadings.map((heading) => heading.textContent)).toEqual(myReservations.map(({ concertTitle }) => concertTitle));
    expect(screen.getAllByText("금요일 공연")).toHaveLength(statusCases.length);
    expect(screen.getAllByText("공연장 A · 2석 · 132,000원")).toHaveLength(statusCases.length);

    statusCases.forEach(([, label]) => expect(screen.getByText(label)).toBeInTheDocument());

    const poster = screen.getByRole("img", { name: "콘서트 1 포스터" });
    expect(poster).toHaveAttribute("src", "https://example.com/poster.jpg");
    expect(screen.queryByRole("img", { name: "콘서트 2 포스터" })).not.toBeInTheDocument();
    fireEvent.error(poster);
    expect(poster).toHaveStyle({ display: "none" });

    expect(container.querySelector('time[datetime="2026-12-18T19:00:00"]')).toBeInTheDocument();
    expect(screen.queryByText("R석 A-12")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
