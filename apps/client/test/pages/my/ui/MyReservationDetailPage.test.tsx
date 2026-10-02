import { MemoryRouter } from "react-router";

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { formatDateTime } from "@shared/lib/date.utils";
import { formatPrice } from "@shared/lib/number.utils";

import MyReservationDetailPage from "@pages/my/ui/MyReservationDetailPage";

const mockUseMyReservationDetail = vi.hoisted(() => vi.fn());
const mockUseMyReservationSeatMap = vi.hoisted(() => vi.fn());

vi.mock("@pages/my/model/use-my-reservation-detail", () => ({ useMyReservationDetail: mockUseMyReservationDetail }));
vi.mock("@pages/my/model/use-my-reservation-seat-map", () => ({ useMyReservationSeatMap: mockUseMyReservationSeatMap }));

const reservation = {
  id: 501,
  concertTitle: "아이유 콘서트",
  posterUrl: "https://example.com/iu-poster.jpg",
  performanceName: "금요일 공연",
  performanceStartsAt: "2026-12-18T19:00:00",
  venueName: "티클 아레나",
  seats: [{ sectionName: "R석", seatLabel: "A-12" }],
  amount: 66000,
  status: "SUCCEEDED" as const,
  createdAt: "2026-09-30T12:00:00",
};

const detailState = {
  isParamValid: true,
  reservation,
  isPending: false,
  isError: false,
  isCancelling: false,
  isCancelConfirmationOpen: false,
  handleCancel: vi.fn(),
  handleConfirmCancel: vi.fn(),
  handleDismissCancel: vi.fn(),
  bank: "",
  setBank: vi.fn(),
  accountNumber: "",
  setAccountNumber: vi.fn(),
  holderName: "",
  setHolderName: vi.fn(),
  handleRefundAccountSubmit: vi.fn(),
  handleBackToReservations: vi.fn(),
};

const seatMapState = {
  isOpen: false,
  open: vi.fn(),
  close: vi.fn(),
  isPending: false,
  isError: false,
  matchingConcertCount: 0,
  venueDetail: undefined,
  selectedSeatIds: new Set<number>(),
  reservationSeatCount: 1,
};

const renderPage = () => render(<MyReservationDetailPage />, { wrapper: MemoryRouter });

describe("MyReservationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMyReservationDetail.mockReturnValue(detailState);
    mockUseMyReservationSeatMap.mockReturnValue(seatMapState);
  });

  it("예매 상세 정보와 취소 동작을 표시한다", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: reservation.concertTitle })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "아이유 콘서트 포스터" })).toHaveAttribute("src", reservation.posterUrl);
    expect(screen.queryByText(/예매 번호/)).not.toBeInTheDocument();
    expect(screen.getByText("티클 아레나")).toBeInTheDocument();
    expect(screen.getByText("R석 A-12")).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(reservation.performanceStartsAt))).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(reservation.createdAt))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(reservation.amount))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "예매 취소" }));
    expect(detailState.handleCancel).toHaveBeenCalledOnce();
  });

  it("예매 목록으로 돌아가기 동작을 훅에 전달한다", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "← 내 예약 목록" }));

    expect(detailState.handleBackToReservations).toHaveBeenCalledOnce();
  });

  it("좌석 보기 버튼을 눌렀을 때 좌석 배치도 모달을 연다", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "좌석 보기" }));

    expect(mockUseMyReservationSeatMap).toHaveBeenCalledWith(reservation);
    expect(seatMapState.open).toHaveBeenCalledOnce();
  });

  it("통일된 예매 취소 확인창에서 각 동작을 훅에 전달한다", async () => {
    const user = userEvent.setup();
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, isCancelConfirmationOpen: true });
    renderPage();

    const dialog = screen.getByRole("dialog", { name: "예매를 취소할까요?" });
    expect(dialog).toHaveTextContent("처리 결과를 이 화면에서 확인할 수 있어요.");
    await user.click(within(dialog).getByRole("button", { name: "취소하지 않기" }));
    expect(detailState.handleDismissCancel).toHaveBeenCalledOnce();

    await user.click(within(dialog).getByRole("button", { name: "예매 취소" }));
    expect(detailState.handleConfirmCancel).toHaveBeenCalledOnce();
  });

  it("좌석 정보가 없으면 대체 문구를 표시한다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: { ...reservation, seats: [] } });
    renderPage();

    expect(screen.getByText("좌석 정보 없음")).toBeInTheDocument();
  });

  it("포스터가 없으면 이미지 요소를 표시하지 않는다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: { ...reservation, posterUrl: null } });
    renderPage();

    expect(screen.queryByRole("img", { name: "아이유 콘서트 포스터" })).not.toBeInTheDocument();
  });

  it("포스터 이미지 로드가 실패하면 기본 아이콘을 남긴다", () => {
    renderPage();
    const poster = screen.getByRole("img", { name: "아이유 콘서트 포스터" });

    fireEvent.error(poster);

    expect(poster).toHaveStyle({ display: "none" });
  });

  it("상세 정보를 불러오는 동안 로딩 상태를 표시한다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: undefined, isPending: true });
    renderPage();

    expect(screen.getByLabelText("예매 상세 정보를 불러오는 중")).toHaveAttribute("aria-busy", "true");
  });

  it("조회 오류와 잘못된 예매 ID를 안내한다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: undefined, isError: true });
    const errorView = renderPage();
    expect(screen.getByRole("heading", { name: "예매 정보를 불러오지 못했습니다." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내 예약 목록으로" })).toBeInTheDocument();
    errorView.unmount();

    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: undefined, isParamValid: false });
    renderPage();
    expect(screen.getByRole("heading", { name: "예매 정보를 찾을 수 없습니다." })).toBeInTheDocument();
  });

  it("상세 재조회에 실패해도 목록 캐시가 있으면 예매 정보를 보여준다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, isError: true });
    renderPage();

    expect(screen.getByRole("heading", { name: reservation.concertTitle })).toBeInTheDocument();
  });

  it("취소할 수 없는 상태에서는 취소 버튼을 표시하지 않는다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: { ...reservation, status: "PAYMENT_PENDING" } });
    renderPage();

    expect(screen.queryByRole("button", { name: "예매 취소" })).not.toBeInTheDocument();
  });

  it("취소 요청 중에는 취소 버튼을 비활성화한다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, isCancelling: true });
    renderPage();

    expect(screen.getByRole("button", { name: "취소 처리 중..." })).toBeDisabled();
  });

  it("취소 대기 상태를 표시한다", () => {
    mockUseMyReservationDetail.mockReturnValue({ ...detailState, reservation: { ...reservation, status: "CANCELLATION_PENDING" } });
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("예매 취소 결과를 확인하고 있어요.");
  });

  it("환불 계좌 입력 변경과 양식 제출을 훅에 전달한다", () => {
    mockUseMyReservationDetail.mockReturnValue({
      ...detailState,
      reservation: { ...reservation, status: "REFUND_ACCOUNT_REQUIRED" },
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("은행 코드"), { target: { value: "004" } });
    fireEvent.change(screen.getByLabelText("계좌번호"), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText("예금주"), { target: { value: "홍길동" } });

    expect(detailState.setBank).toHaveBeenCalledWith("004");
    expect(detailState.setAccountNumber).toHaveBeenCalledWith("0123456789");
    expect(detailState.setHolderName).toHaveBeenCalledWith("홍길동");

    fireEvent.submit(screen.getByRole("button", { name: "환불 계좌 제출" }).closest("form")!);

    expect(detailState.handleRefundAccountSubmit).toHaveBeenCalledOnce();
  });

  it("환불 요청 중에는 계좌 제출 버튼을 비활성화한다", () => {
    mockUseMyReservationDetail.mockReturnValue({
      ...detailState,
      reservation: { ...reservation, status: "REFUND_ACCOUNT_REQUIRED" },
      isCancelling: true,
    });
    renderPage();

    expect(screen.getByRole("button", { name: "환불을 요청하는 중..." })).toBeDisabled();
  });
});
