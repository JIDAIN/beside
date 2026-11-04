import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(root + "/" + path, "utf8");
const migration = read("supabase/migrations/20261104005447_life_wishes.sql");
const media = read("app/api/life/wishes/[id]/photo/route.ts");
const server = read("lib/server/life-wishes.ts");
const ui = read("components/life/LifeWishesPage.tsx");

describe("shared wish list boundary", () => {
  it("keeps the image bucket private and restricts RPC use to service role", () => {
    expect(migration).toContain("values('wish-photos','wish-photos',false");
    expect(migration).toContain("alter table public.life_wishes enable row level security");
    expect(migration).toContain("revoke execute on function public.bind_life_wish_image");
    expect(migration).toContain("to service_role");
  });
  it("preserves trusted system fields and does not accept browser photo binding", () => {
    expect(migration).toContain("- 'id' - 'createdBy' - 'createdAt' - 'updatedAt'");
    expect(migration).toContain("jsonb_build_object('imagePath',data->'imagePath')");
    expect(server).toContain("imagePath:null");
  });
  it("authorizes photo operations before any upload, and cleans up failed binding", () => {
    expect(media).toContain("authorizeLifeRequest(request)");
    expect(media).toContain("await uploadWishPhoto(path,compressed.bytes)");
    expect(media).toContain("await deleteWishPhoto(path).catch");
    expect(media).toContain("file.size>10*1024*1024");
  });
  it("keeps edit identity on photo failure to avoid duplicate POST", () => {
    expect(ui).toContain("setEditing(saved)");
    expect(ui).toContain("setPhotoFile(null)");
    expect(ui).toContain('window.confirm("有尚未保存的修改');
  });
});
