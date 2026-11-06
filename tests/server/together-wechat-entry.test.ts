import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/fixed-life-auth", () => ({
  resolveFixedLifeIdentity: vi.fn(),
}));

import { resolveFixedLifeIdentity } from "@/lib/server/fixed-life-auth";
import { GET } from "../../app/open/together/route";

const mockedIdentity = vi.mocked(resolveFixedLifeIdentity);
const proposal = "a40bad4a-535d-431b-98e7-fb7907f25c3c";

describe("Together WeChat notification entry", () => {
  it("sends a logged-out visitor to password login with a safe return path", async () => {
    mockedIdentity.mockReturnValue(null);
    const response = await GET(new Request(`https://beside.example/open/together?proposal=${proposal}`));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("next")).toBe(`/nest/together?proposal=${proposal}`);
  });

  it("reuses a signed Cat/Fish session without switching identity", async () => {
    mockedIdentity.mockReturnValue({ partnerKey: "fish", displayName: "鱼鱼" });
    const response = await GET(new Request(`https://beside.example/open/together?proposal=${proposal}`));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/nest/together");
    expect(new URL(response.headers.get("location")!).searchParams.get("proposal")).toBe(proposal);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("ignores malicious or invalid IDs instead of reflecting arbitrary destinations", async () => {
    mockedIdentity.mockReturnValue(null);
    const response = await GET(new Request("https://beside.example/open/together?proposal=https://evil.example"));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.origin).toBe("https://beside.example");
    expect(destination.searchParams.get("next")).toBe("/nest/together");
  });
});
