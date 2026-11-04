import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({list:vi.fn(),write:vi.fn(),deletePhoto:vi.fn()}));
vi.mock("../../lib/server/life-wishes",async(importOriginal)=>{
  const original=await importOriginal<typeof import("../../lib/server/life-wishes")>();
  return {...original,listWishes:mocks.list,writeWish:mocks.write};
});
vi.mock("../../lib/server/life-wish-photos",()=>({deleteWishPhoto:mocks.deletePhoto}));
import {mutateAgentWish,queryAgentWishes} from "../../lib/server/life-wish-agent";
const ID="00000000-0000-4000-8000-000000000001";
const POINT="00000000-0000-4000-8000-000000000002";
const existing={
 id:ID,title:"潭柘寺",category:"go",description:null,location:"北京门头沟",
 openingHours:null,priceNote:null,durationNote:"2小时",bestTimeNote:"秋天",
 practicalNotes:"看千年银杏",imagePath:"couple-better-game/x/cover.webp",
 referenceUrls:[],checklist:[{id:POINT,title:"帝王树",sortOrder:0}],
 visits:[{id:"v1",visitedOn:"2026-10-02",note:"很漂亮",completedItemIds:[POINT]}],
 wantToRepeat:true,archivedAt:null,createdBy:"cat",createdAt:"2026-10-01",updatedAt:"2026-10-02",
};
beforeEach(()=>{vi.clearAllMocks();mocks.list.mockResolvedValue([existing]);mocks.write.mockResolvedValue(existing);});
describe("wish agent service",()=>{
 it("does not create a second wish when the same title/category already exists",async()=>{
  const result=await mutateAgentWish("create",null,{title:"潭柘寺",category:"想去"},"fish");
  expect(result).toMatchObject({alreadyExists:true});
  expect(mocks.write).not.toHaveBeenCalled();
 });
 it("uses the signed actor for genuinely new wishes",async()=>{
  mocks.list.mockResolvedValue([]);
  await mutateAgentWish("create",null,{title:"潭柘寺",category:"想去",createdBy:"cat",checklist:["小猫","帝王树"]},"fish");
  expect(mocks.write).toHaveBeenCalledWith("fish",null,expect.objectContaining({
    title:"潭柘寺",category:"go",checklist:[expect.objectContaining({title:"小猫"}),expect.objectContaining({title:"帝王树"})],
  }));
 });
 it("preserves existing visits and checklist on note-only updates",async()=>{
  await mutateAgentWish("update",ID,{notes:"小猫 + 帝王树",visits:[],createdBy:"fish"},"fish");
  expect(mocks.write).toHaveBeenCalledWith("fish",ID,expect.objectContaining({
    practicalNotes:"小猫 + 帝王树",visits:existing.visits,checklist:existing.checklist,imagePath:null,
  }));
 });
 it("requires exact ID and never guesses from the title for update/delete",async()=>{
  await expect(mutateAgentWish("update",null,{title:"潭柘寺"},"cat")).rejects.toThrow("记录 ID");
  expect(mocks.write).not.toHaveBeenCalled();
 });
 it("deletes the shared item through the scoped service and cleans up its cover",async()=>{
  await mutateAgentWish("delete",ID,{},"fish");
  expect(mocks.write).toHaveBeenCalledWith("fish",ID,null,true);
  expect(mocks.deletePhoto).toHaveBeenCalledWith(existing.imagePath);
 });
 it("filters shared wishes by text/category/status",async()=>{
  const rows=await queryAgentWishes({name:"潭柘",category:"想去",status:"again"});
  expect(rows).toHaveLength(1);
  expect(await queryAgentWishes({status:"want"})).toEqual([]);
 });
});
