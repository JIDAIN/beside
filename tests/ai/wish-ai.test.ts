import { describe, expect, it } from "vitest";
import { buildWishCreate, buildWishUpdate, buildWishVisit, wishFields, normalizeWishCategory } from "../../lib/life/wish-ai";
import { parseWishWrite } from "../../lib/server/life-wishes";
import type { WishEntry } from "../../lib/life/wish-list-model";
const makeEntry=():WishEntry=>({
 id:"00000000-0000-4000-8000-000000000001",category:"go",title:"潭柘寺",
 description:null, location:"北京门头沟", openingHours:null, priceNote:null,
 durationNote:null,bestTimeNote:"秋天",practicalNotes:"看银杏",
 imagePath:"couple-better-game/abc/cover.webp",referenceUrls:["https://example.com"],
 checklist:[{id:"00000000-0000-4000-8000-000000000002",title:"帝王树",sortOrder:0}],
 visits:[{id:"00000000-0000-4000-8000-000000000003",visitedOn:"2026-10-03",note:"上次看了树",completedItemIds:["00000000-0000-4000-8000-000000000002"]}],
 wantToRepeat:true,archivedAt:null,createdBy:"fish",createdAt:"2026-09-01",updatedAt:"2026-10-03",
});
describe("AI wish write helpers",()=>{
 it("accepts Chinese category and simple point names without fabricating opening hours",()=>{
  const value=parseWishWrite(buildWishCreate({name:"潭柘寺",category:"想去",location:"北京门头沟",checklist:["帝王树","寺里的小猫"],practicalNotes:"优先秋季"}));
  expect(value).toMatchObject({title:"潭柘寺",category:"go",openingHours:null,practicalNotes:"优先秋季"});
  expect(value.checklist.map(x=>x.title)).toEqual(["帝王树","寺里的小猫"]);
  expect(value.visits).toEqual([]);
  expect(normalizeWishCategory("想吃")).toBe("eat");
 });
 it("preserves history and media while patching only a note",()=>{
  const old=makeEntry();
  const patch=parseWishWrite(buildWishUpdate(wishFields(old),{notes:"想看猫咪和帝王树",createdBy:"cat",imagePath:"evil.webp",visits:[]}));
  expect(patch.practicalNotes).toBe("想看猫咪和帝王树");
  expect(patch.visits).toEqual(old.visits);
  expect(patch.checklist).toEqual(old.checklist);
  expect(patch.imagePath).toBeNull(); // Only the server image RPC may set photo path.
 });
 it("reuses point IDs and drops orphan completion references on checklist replacement",()=>{
  const patch=buildWishUpdate(wishFields(makeEntry()),{spots:["帝王树","小猫"]});
  expect(patch.checklist[0].id).toBe(makeEntry().checklist[0].id);
  expect(patch.visits[0].completedItemIds).toEqual([makeEntry().checklist[0].id]);
 });
 it("records a new visit without modifying prior visits or global point status",()=>{
  const old=makeEntry();
  const data=parseWishWrite(buildWishVisit(old,{visitedOn:"2026-11-04",note:"又遇到猫了",completedSpots:["帝王树"],wantToRepeat:true}));
  expect(data.visits).toHaveLength(2);
  expect(data.visits[0]).toEqual(old.visits[0]);
  expect(data.visits[1].completedItemIds).toEqual([old.checklist[0].id]);
  expect(data.wantToRepeat).toBe(true);
 });
 it("rejects unknown point names and invalid dates",()=>{
  expect(()=>buildWishVisit(makeEntry(),{visitedOn:"yesterday",completedSpots:[]})).toThrow();
  expect(()=>buildWishVisit(makeEntry(),{visitedOn:"2026-11-04",completedSpots:["fake"]})).toThrow();
 });
});
