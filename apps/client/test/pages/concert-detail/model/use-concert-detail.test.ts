import { act, renderHook } from "@testing-library/react";

import { USER_ROLE, useSessionStore } from "@entities/session";
import type { User } from "@entities/session/model/session.types";

import { useConcertDetail } from "@pages/concert-detail/model/use-concert-detail";

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  delete: vi.fn(),
  navigate: vi.fn(),
  removeQueries: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  mockRefetch: vi.fn(),
  mockUseConcertDetail: vi.fn(),
  mockUseParams: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ removeQueries: mocks.removeQueries }) }));
vi.mock("@shared/api", () => ({ apiClient: { DELETE: mocks.delete } }));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.toastError, success: mocks.toastSuccess } }));
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => mocks.navigate,
  useParams: mocks.mockUseParams,
}));

vi.mock("@entities/concert", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@entities/concert")>();

  return {
    ...actual,
    useConcertDetail: mocks.mockUseConcertDetail,
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
    vi.stubGlobal("confirm", mocks.confirm);
    mocks.mockUseParams.mockReturnValue({ concertId: "1" });
    mocks.mockUseConcertDetail.mockReturnValue({
      data: {
        concert: { id: 1, title: "테스트 콘서트" },
        performances: [],
      },
      isPending: false,
      isError: false,
      refetch: mocks.mockRefetch,
    });
    useSessionStore.setState({
      user: null,
      status: "unauthenticated",
      justLoggedOut: false,
    });
  });

  it("URL ID와 상세 조회 결과를 화면 상태로 조합한다", () => {
    const { result } = renderHook(() => useConcertDetail());

    expect(mocks.mockUseConcertDetail).toHaveBeenCalledWith(1);
    expect(result.current).toMatchObject({
      concert: { id: 1, title: "테스트 콘서트" },
      performances: [],
      isAdmin: false,
      isError: false,
      isParamValid: true,
      isPending: false,
      refetch: mocks.mockRefetch,
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
    mocks.mockUseConcertDetail.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });

    const { result } = renderHook(() => useConcertDetail());

    expect(result.current.concert).toBeUndefined();
    expect(result.current.performances).toEqual([]);
  });

  it("잘못된 ID는 유효하지 않은 상태로 처리한다", () => {
    mocks.mockUseParams.mockReturnValue({ concertId: "invalid" });

    const { result } = renderHook(() => useConcertDetail());

    expect(mocks.mockUseConcertDetail).toHaveBeenCalledWith(Number.NaN);
    expect(result.current.isParamValid).toBe(false);
  });

  it("삭제 성공 시 콘서트와 공연장 캐시를 제거하고 목록으로 이동한다", async () => {
    mocks.confirm.mockReturnValue(true);
    mocks.delete.mockResolvedValue({ data: { data: true }, response: { ok: true } });
    const { result } = renderHook(() => useConcertDetail());

    await act(() => result.current.handleDelete());

    expect(mocks.delete).toHaveBeenCalledWith("/api/concerts/{id}", { params: { path: { id: 1 } } });
    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ["concerts"] });
    expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ["venues"] });
    expect(mocks.navigate).toHaveBeenCalledWith("/concerts");
  });

  it("삭제를 취소하면 API를 호출하지 않는다", async () => {
    mocks.confirm.mockReturnValue(false);
    const { result } = renderHook(() => useConcertDetail());

    await act(() => result.current.handleDelete());

    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("삭제에 실패하면 오류를 알리고 캐시를 변경하거나 이동하지 않는다", async () => {
    mocks.confirm.mockReturnValue(true);
    mocks.delete.mockResolvedValue({ response: { ok: false } });
    const { result } = renderHook(() => useConcertDetail());

    await act(() => result.current.handleDelete());

    expect(mocks.toastError).toHaveBeenCalledWith("콘서트 삭제에 실패했습니다.\n잠시 후 다시 시도해주세요.");
    expect(mocks.removeQueries).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
