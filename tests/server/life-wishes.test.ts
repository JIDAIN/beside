import { describe, expect, it } from "vitest";
import { parseWishWrite } from "../../lib/server/life-wishes";
const valid=()=>({title:"玉渊潭公园",category:"go",description:null,location:"北京",openingHours:"以公告为准",priceNote:null,durationNote:"2小时",bestTimeNote:null,practicalNotes:"注意开放时间",imagePath:null,referenceUrls:["https://example.com"],checklist:[{id:"point-1",title:"看日落",sortOrder:0}],visits:[{id:"visit-1",visitedOn:"2026-11-02",note:"不错",completedItemIds:["point-1"]}],wantToRepeat:true,archivedAt:null});
describe("wish-list input boundary",()=>{
 it("allows repeat visits and checked spots",()=>{const result=parseWishWrite(valid());expect(result.visits[0].completedItemIds).toEqual(["point-1"]);});
 it("removes blank draft URLs",()=>{const result=parseWishWrite({...valid(),referenceUrls:[" ","https://example.com"]});expect(result.referenceUrls).toEqual(["https://example.com"]);});
 it("rejects unsafe URLs",()=>expect(()=>parseWishWrite({...valid(),referenceUrls:["javascript:alert(1)"]})).toThrow());
 it("rejects invalid categories",()=>expect(()=>parseWishWrite({...valid(),category:"unknown"})).toThrow());
 it("rejects invalid checklists",()=>expect(()=>parseWishWrite({...valid(),checklist:[{id:"x",title:"",sortOrder:0}]})).toThrow());
});
