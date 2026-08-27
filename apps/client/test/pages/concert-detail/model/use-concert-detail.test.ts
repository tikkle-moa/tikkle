import { renderHook } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import { useConcertDetail } from "@pages/concert-detail/model/use-concert-detail";

const { mockUseConcertDetail, mockUseParams } = vi.hoisted(() => ({
  mockUseConcertDetail: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("react-router", () => ({
  useParams: mockUseParams,
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();

  return {
    ...actual,
    useConcertDetail: mockUseConcertDetail,
  };
});

const makeUser = (role: User["role"]): User => ({
  id: 1,
  email: "admin@example.com",
  nickname: "관리자",
  profileImageUrl: null,
  role,
  oauthAccounts: ["google"],
});

describe("useConcertDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ concertId: "1" });
    mockUseConcertDetail.mockReturnValue({
      data: {
        concert: { id: 1, title: "테스트 콘서트" },
        performances: [],
      },
      isPending: false,
      isError: false,
    });
    useSessionStore.setState({
      user: null,
      status: "unauthenticated",
      justLoggedOut: false,
    });
  });

  it("URL ID와 상세 조회 결과를 화면 상태로 조합한다", () => {
    const { result } = renderHook(() => useConcertDetail());

    expect(mockUseConcertDetail).toHaveBeenCalledWith(1);
    expect(result.current).toMatchObject({
      concert: { id: 1, title: "테스트 콘서트" },
      performances: [],
      isAdmin: false,
      isError: false,
      isParamValid: true,
      isPending: false,
    });
  });

  it("관리자는 관리자 상태를 가진다", () => {
    useSessionStore.setState({
      user: makeUser(USER_ROLE.ADMIN),
      status: "authenticated",
    });

    const { result } = renderHook(() => useConcertDetail());

    expect(result.current.isAdmin).toBe(true);
  });

  it("조회 데이터가 없으면 빈 회차 목록을 반환한다", () => {
    mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    const { result } = renderHook(() => useConcertDetail());

    expect(result.current.concert).toBeUndefined();
    expect(result.current.performances).toEqual([]);
  });

  it("잘못된 ID는 유효하지 않은 상태로 처리한다", () => {
    mockUseParams.mockReturnValue({ concertId: "invalid" });

    const { result } = renderHook(() => useConcertDetail());

    expect(mockUseConcertDetail).toHaveBeenCalledWith(Number.NaN);
    expect(result.current.isParamValid).toBe(false);
  });
});
