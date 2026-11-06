import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Proposal } from "../../lib/life/proposal-model";

const mock = vi.hoisted(() => ({
  list: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock("../../lib/server/life-proposals", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/server/life-proposals")>();
  return { ...real, listTogetherProposals: mock.list, mutateTogetherProposal: mock.mutate };
});
import { LIFE_AGENT_TOOLS, executeLifeAgentTool } from "../../lib/server/life-agent-registry";
import { proposalRequestId } from "../../lib/server/life-proposal-agent";
import { normalizeLifeMutationArgs, normalizeLifeQueryArgs, LifeClarificationError } from "../../lib/ai/life-input-normalizer";

const CAT = { partnerKey: "cat" as const, displayName: "猫猫" };
const FISH = { partnerKey: "fish" as const, displayName: "鱼鱼" };
const ID = "00000000-0000-4000-8000-000000000001";
const START = "2026-12-01T20:30:00+08:00";
const row: Proposal = {
  id: ID, createdBy: "cat", recipientKey: "fish",
  title: "一起散步", note: "走十分钟就好",
  scheduledAt: START, durationMinutes: 30,
  status: "pending", waitingFor: "fish",
  candidateAt: null, candidateDuration: null,
  encouragementBy: null, rescheduleCount: 0,
  results: {}, outcome: null, version: 4,
  createdAt: "2026-11-05T08:00:00.000Z",
  updatedAt: "2026-11-05T08:00:00.000Z", closedAt: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.list.mockResolvedValue([row]);
  mock.mutate.mockResolvedValue(row);
});

describe("Together in canonical life_query/life_mutate", () => {
  it("keeps only the 3 existing stable MCP tools and advertises proposal capabilities", async () => {
    expect(LIFE_AGENT_TOOLS.map((x) => x.function.name)).toEqual(["life_capabilities", "life_query", "life_mutate"]);
    const caps = await executeLifeAgentTool("life_capabilities", {}, { identity: CAT, latestUserText: "" }) as {
      query: Record<string, string>; mutate: Record<string, string>;
    };
    expect(caps.query.proposal).toContain("共享提案");
    expect(caps.mutate.proposal).toContain("create/accept");
  });
  it("normalizes Chinese aliases and reads shared proposals with caller-relative scope", async () => {
    const result = await executeLifeAgentTool("life_query", {
      resource: "一起做吧", status: "待我回应",
    }, { identity: FISH, latestUserText: "我有哪些待回应的邀请？" });
    expect(result).toEqual([row]);
    const none = await executeLifeAgentTool("life_query", {
      resource: "提案", status: "待我回应",
    }, { identity: CAT, latestUserText: "我有哪些待回应的邀请？" });
    expect(none).toEqual([]);
    expect(mock.list).toHaveBeenCalledTimes(2);
  });
  it("filters status, title, id and own/partner creator safely", async () => {
    const result = await executeLifeAgentTool("life_query", {
      resource: "proposal", id: ID, name: "散步", scope: "created_ta", status: "pending",
    }, { identity: FISH, latestUserText: "看看 Ta 发起的散步邀请" });
    expect(result).toEqual([row]);
    await expect(executeLifeAgentTool("life_query", {
      resource: "proposal", id: "wrong-id",
    }, { identity: CAT, latestUserText: "查询这个邀请" })).rejects.toThrow("邀请 ID 无效");
  });
  it("creates a proposal with signed actor, Shanghai time and a conservative duration default", async () => {
    await executeLifeAgentTool("life_mutate", {
      resource: "双人提案", action: "发起", data: {
        title: "一起敷面膜", scheduledAt: "2099-01-01T21:00",
        createdBy: "fish", recipientKey: "cat",
      },
    }, { identity: CAT, latestUserText: "帮我发起一个邀请，2099年1月1日21点一起敷面膜" });
    const call = mock.mutate.mock.calls[0];
    expect(call[0]).toBe("cat");
    expect(call[1]).toBe("create");
    expect(call[2]).toBeNull();
    expect(call[3]).toEqual({
      title: "一起敷面膜", note: "", scheduledAt: "2099-01-01T13:00:00.000Z",
      durationMinutes: 20,
    });
    expect(call[5]).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("responds as the OAuth actor, requires exact ID and query version", async () => {
    await expect(executeLifeAgentTool("life_mutate", {
      resource: "proposal", action: "accept", id: ID, data: {},
    }, { identity: FISH, latestUserText: "好呀，我同意散步" })).rejects.toThrow(LifeClarificationError);
    await expect(executeLifeAgentTool("life_mutate", {
      resource: "proposal", action: "accept", expectedVersion: 4, data: {},
    }, { identity: FISH, latestUserText: "同意散步" })).rejects.toThrow(LifeClarificationError);
    expect(mock.mutate).not.toHaveBeenCalled();
    await executeLifeAgentTool("life_mutate", {
      resource: "proposal", action: "拉我一把", id: ID, expectedVersion: 4,
      data: { actor: "cat", waitingFor: "cat" },
    }, { identity: FISH, latestUserText: "有点懒，拉我一把吧" });
    expect(mock.mutate).toHaveBeenCalledWith("fish", "encourage", ID, {}, 4, expect.any(String));
  });
  it("does not accept or decline based on a discussion-only current message", async () => {
    await expect(executeLifeAgentTool("life_mutate", {
      resource: "proposal", action: "decline", id: ID, expectedVersion: 4, data: {},
    }, { identity: FISH, latestUserText: "我应该怎样回复这个邀请？" })).rejects.toThrow(LifeClarificationError);
    expect(mock.mutate).not.toHaveBeenCalled();
  });
  it("reuses original duration in counter proposal but requires new timestamp", async () => {
    await executeLifeAgentTool("life_mutate", {
      resource: "proposal", action: "counter", id: ID, expectedVersion: 4,
      data: { scheduledAt: "2099-01-02T21:00+08:00" },
    }, { identity: FISH, latestUserText: "我想把时间改到2099年1月2日21点" });
    expect(mock.mutate.mock.calls[0].slice(0, 5)).toEqual([
      "fish", "counter", ID, { scheduledAt: "2099-01-02T21:00+08:00", durationMinutes: 30 }, 4,
    ]);
    expect(() => normalizeLifeMutationArgs({
      resource: "proposal", action: "counter", id: ID, data: {},
    }, { latestUserText: "改个时间", actor: "fish" })).toThrow(LifeClarificationError);
  });
  it("maps the speaker's completion result and never supplies Ta's result", async () => {
    await executeLifeAgentTool("life_mutate", {
      resource: "一起做吧", action: "确认结果", id: ID, expectedVersion: 4,
      data: { result: "做了一点", fish: "done", cat: "done" },
    }, { identity: FISH, latestUserText: "确认结果，我只做了一点" });
    expect(mock.mutate).toHaveBeenCalledWith(
      "fish", "result", ID, { result: "partial" }, 4, expect.any(String),
    );
  });
  it("produces a repeat-safe request ID within a window and actor isolation", () => {
    const at = new Date("2026-11-06T20:00:00.000Z").getTime();
    const x = proposalRequestId("cat", "create", null, { title: "散步" }, "邀请她散步", at);
    expect(proposalRequestId("cat", "create", null, { title: "散步" }, "邀请她散步", at + 10_000)).toBe(x);
    expect(proposalRequestId("fish", "create", null, { title: "散步" }, "邀请她散步", at)).not.toBe(x);
    expect(proposalRequestId("cat", "create", null, { title: "散步" }, "邀请她散步", at + 610_000)).not.toBe(x);
  });
  it("requires explicit date and valid result; does not guess a clock", () => {
    expect(() => normalizeLifeMutationArgs({
      resource: "提案", action: "create", data: { title: "散步", time: "20:00" },
    }, { actor: "cat", latestUserText: "帮我邀请她去散步" })).toThrow(LifeClarificationError);
    expect(() => normalizeLifeMutationArgs({
      resource: "提案", action: "result", id: ID, data: { result: "还不知道" },
    }, { actor: "cat", latestUserText: "记录结果" })).toThrow(LifeClarificationError);
    expect(normalizeLifeQueryArgs({ resource: "一起做吧", status: "历史" }, {
      actor: "cat", latestUserText: "查看历史",
    })).toMatchObject({ resource: "proposal", status: "history" });
  });
});
