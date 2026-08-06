import { MemoryRouter } from "react-router";

import { useSessionStore } from "@/entities/session";
import type { User } from "@/entities/session";
import Header from "@/widgets/header/ui/Header";
import { render, screen } from "@testing-library/react";

const TEST_USER: User = {
  id: 1,
  email: "test@example.com",
  nickname: "테스트 사용자",
  profileImageUrl: null,
  role: "USER",
  oauthAccounts: ["google"],
};

const renderHeader = () => {
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
};

describe("Header", () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: null,
      status: "idle",
    });
  });

  it.each(["idle", "loading"] as const)("%s 상태에서는 로그인 확인 중을 표시한다", (status) => {
    useSessionStore.setState({ status });

    renderHeader();

    expect(screen.getByText("로그인 확인 중")).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "로그인",
      }),
    ).not.toBeInTheDocument();
  });

  it.each(["unauthenticated", "error"] as const)("%s 상태에서는 로그인 버튼을 표시한다", (status) => {
    useSessionStore.setState({ status });

    renderHeader();

    expect(
      screen.getByRole("button", {
        name: "로그인",
      }),
    ).toBeInTheDocument();
  });

  it("로그인 상태에서는 사용자 닉네임을 표시한다", () => {
    useSessionStore.setState({
      user: TEST_USER,
      status: "authenticated",
    });

    renderHeader();

    expect(screen.getByText(TEST_USER.nickname)).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "로그인",
      }),
    ).not.toBeInTheDocument();
  });
});
