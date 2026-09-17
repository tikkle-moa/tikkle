import { MemoryRouter, Route, Routes } from "react-router";

import { act, renderHook } from "@testing-library/react";

import { usePaymentPage } from "@pages/payment/model/use-payment-page";

const navigate = vi.hoisted(() => vi.fn());
const usePaymentOrder = vi.hoisted(() => vi.fn());
const useSessionStore = vi.hoisted(() => vi.fn());

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => navigate };
});
vi.mock("@pages/payment/model/use-payment-order", () => ({ usePaymentOrder }));
vi.mock("@entities/session", () => ({ useSessionStore }));

describe("usePaymentPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    usePaymentOrder.mockReturnValue({ order: null, errorMessage: null, isLoading: false, isFixture: false });
    useSessionStore.mockImplementation((selector: (state: { user: null }) => unknown) => selector({ user: null }));
  });

  it("일반 결제 route의 reservation id와 사용자를 제공한다", () => {
    const user = { id: 1 };
    useSessionStore.mockImplementation((selector: (state: { user: typeof user }) => unknown) => selector({ user }));

    const { result } = renderHook(() => usePaymentPage(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={["/payments/501"]}>
          <Routes>
            <Route path="/payments/:reservationId" element={children} />
          </Routes>
        </MemoryRouter>
      ),
    });

    expect(result.current.isReservationIdValid).toBe(true);
    expect(result.current.user).toBe(user);
    expect(usePaymentOrder).toHaveBeenCalledWith({ reservationId: 501, fixture: false });
  });

  it("잘못된 id와 fixture 결제를 처리하고 뒤로가기를 제공한다", () => {
    const invalid = renderHook(() => usePaymentPage(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={["/payments/invalid"]}>{children}</MemoryRouter>,
    });
    expect(invalid.result.current.isReservationIdValid).toBe(false);

    const fixture = renderHook(() => usePaymentPage({ fixture: true }), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
    expect(fixture.result.current.isReservationIdValid).toBe(true);
    act(() => fixture.result.current.handleBack());
    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
