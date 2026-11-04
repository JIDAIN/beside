import { beforeEach,describe,expect,it,vi } from "vitest";
const fake=vi.hoisted(()=>({
  query:vi.fn(), mutate:vi.fn(),
}));
vi.mock("../../lib/server/life-wish-agent",()=>({
  queryAgentWishes:fake.query,mutateAgentWish:fake.mutate,
}));
import { executeLifeAgentTool } from "../../lib/server/life-agent-registry";
const CAT={partnerKey:"cat" as const,displayName:"猫猫" as const};
const FISH={partnerKey:"fish" as const,displayName:"鱼鱼" as const};
const ID="00000000-0000-4000-8000-000000000001";
beforeEach(()=>{vi.clearAllMocks();fake.query.mockResolvedValue([]);fake.mutate.mockResolvedValue({item:{id:ID,title:"潭柘寺",category:"go"}});});
describe("wish resource in canonical AI Access Core",()=>{
 it("exposes shared query and mutation capabilities without another MCP tool",async()=>{
  const caps=await executeLifeAgentTool("life_capabilities",{}, {identity:CAT,latestUserText:""}) as {query:Record<string,string>;mutate:Record<string,string>};
  expect(caps.query.wish).toContain("共享心愿");
  expect(caps.mutate.wish).toContain("create/update");
 });
 it("normalizes Chinese wish aliases and delegates to the same canonical adapter",async()=>{
  await executeLifeAgentTool("life_query",{resource:"心愿清单",name:"潭柘寺",category:"想去"},
    {identity:CAT,latestUserText:"看看潭柘寺心愿"});
  expect(fake.query).toHaveBeenCalledWith(expect.objectContaining({name:"潭柘寺",category:"想去"}));
 });
 it("uses the signed OAuth actor rather than a user-supplied createdBy field",async()=>{
  await executeLifeAgentTool("life_mutate",{
    resource:"wish",action:"create",data:{title:"潭柘寺",category:"go",createdBy:"cat"},
  },{identity:FISH,latestUserText:"把潭柘寺加入我们的心愿清单"});
  expect(fake.mutate).toHaveBeenCalledWith("create",undefined,expect.objectContaining({title:"潭柘寺"}),"fish");
 });
 it("requires explicit current-message delete intent before the domain mutator runs",async()=>{
  await expect(executeLifeAgentTool("life_mutate",{
    resource:"wish",action:"delete",id:ID,data:{},
  },{identity:CAT,latestUserText:"查一下这个心愿"})).rejects.toThrow("明确要求删除");
  expect(fake.mutate).not.toHaveBeenCalled();
 });
 it("uses original wish ID to add a visit, without changing another person's activity",async()=>{
  await executeLifeAgentTool("life_mutate",{
    resource:"心愿清单",action:"add_visit",id:ID,data:{note:"看到了小猫",completedSpots:["帝王树"]},
  },{identity:CAT,latestUserText:"今天去潭柘寺了，记录一次体验"});
  expect(fake.mutate).toHaveBeenCalledWith("add_visit",ID,expect.objectContaining({
    note:"看到了小猫",visitedOn:expect.stringMatching(/^\\d{4}-\\d{2}-\\d{2}$/),
  }),"cat");
 });
});
