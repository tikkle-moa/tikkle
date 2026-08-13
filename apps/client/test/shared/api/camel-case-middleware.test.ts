import { camelCaseMiddleware } from "@shared/api/camel-case-middleware";

const callOnResponse = (response: Response) =>
  camelCaseMiddleware.onResponse!({
    response,
  } as Parameters<NonNullable<typeof camelCaseMiddleware.onResponse>>[0]);

describe("camelCaseMiddleware", () => {
  it("JSON 응답의 snake_case 키를 재귀적으로 camelCase로 변환한다", async () => {
    const response = new Response(
      JSON.stringify({
        data: {
          profile_image_url: "https://example.com/profile.png",
          oauth_accounts: ["google"],
        },
      }),
      {
        headers: { "content-type": "application/json" },
        status: 200,
      },
    );

    const result = await callOnResponse(response);

    expect(await result?.json()).toEqual({
      data: {
        profileImageUrl: "https://example.com/profile.png",
        oauthAccounts: ["google"],
      },
    });
  });

  it("JSON이 아닌 응답은 변환하지 않고 그대로 반환한다", async () => {
    const response = new Response("ok", {
      headers: { "content-type": "text/plain" },
    });

    await expect(callOnResponse(response)).resolves.toBe(response);
  });
});
