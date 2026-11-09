import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { GET, POST } from "../../app/api/wechat/official/callback/route";
import {
  decodeWechatXmlValue,
  decryptWechatPayload,
  encryptWechatPayload,
  loadWechatOfficialConfig,
} from "../../lib/server/wechat-official-crypto";

const TOKEN = "besideTestToken12345";
const APP_ID = "wx1234567890abcdef";
const ENCODING_AES_KEY = randomBytes(32).toString("base64").replace(/=$/, "");
const endpoint = "https://example.test/api/wechat/official/callback";
const keys = ["WECHAT_OFFICIAL_APP_ID", "WECHAT_OFFICIAL_TOKEN", "WECHAT_OFFICIAL_ENCODING_AES_KEY"] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const timestamp = () => String(Math.floor(Date.now() / 1000));
const signature = (...strings: string[]) => createHash("sha1").update(strings.sort().join("")).digest("hex");
const route = (params: Record<string, string>) => endpoint + "?" + new URLSearchParams(params).toString();
const encryptedMessage = (body: string) => {
  const config = loadWechatOfficialConfig();
  const encrypted = encryptWechatPayload(body, config);
  const ts = timestamp();
  const nonce = "randomNonce";
  return {
    url: route({ timestamp: ts, nonce, encrypt_type: "aes", msg_signature: signature(TOKEN, ts, nonce, encrypted) }),
    xml: "<xml><Encrypt><![CDATA[" + encrypted + "]]></Encrypt></xml>",
  };
};
const message = (content: string) =>
  "<xml><ToUserName><![CDATA[gh_test]]></ToUserName>"
  + "<FromUserName><![CDATA[openIdExample]]></FromUserName>"
  + "<CreateTime>1700000000</CreateTime><MsgType><![CDATA[text]]></MsgType>"
  + "<Content><![CDATA[" + content + "]]></Content><MsgId>12345</MsgId></xml>";

beforeEach(() => {
  process.env.WECHAT_OFFICIAL_TOKEN = TOKEN;
  process.env.WECHAT_OFFICIAL_APP_ID = APP_ID;
  process.env.WECHAT_OFFICIAL_ENCODING_AES_KEY = ENCODING_AES_KEY;
});
afterEach(() => {
  for (const key of keys) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("WeChat official account secure callback", () => {
  it("validates standard plaintext challenge without exposing secrets", async () => {
    const ts = timestamp();
    const nonce = "testingNonce";
    const response = await GET(new Request(route({
      timestamp: ts, nonce, echostr: "wechat_challenge", signature: signature(TOKEN, ts, nonce),
    })));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("wechat_challenge");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects invalid, expired and absent signatures and missing config", async () => {
    const ts = timestamp();
    const u = route({ timestamp: ts, nonce: "testNonce", echostr: "challenge", signature: "0".repeat(40) });
    expect((await GET(new Request(u))).status).toBe(403);
    const old = String(Number(ts) - 301);
    const expired = route({ timestamp: old, nonce: "testNonce", echostr: "challenge", signature: signature(TOKEN, old, "testNonce") });
    expect((await GET(new Request(expired))).status).toBe(403);
    delete process.env.WECHAT_OFFICIAL_TOKEN;
    expect((await GET(new Request(u))).status).toBe(503);
  });

  it("accepts an encrypted GET challenge when supplied", async () => {
    const encrypted = encryptWechatPayload("encrypted_challenge", loadWechatOfficialConfig());
    const ts = timestamp(), nonce = "encryptedNonce";
    const result = await GET(new Request(route({ timestamp: ts, nonce, echostr: encrypted,
      msg_signature: signature(TOKEN, ts, nonce, encrypted) })));
    expect(result.status).toBe(200);
    expect(await result.text()).toBe("encrypted_challenge");
  });

  it("verifies POST signature, decrypts XML and securely returns the greeting", async () => {
    const payload = encryptedMessage(message("你好"));
    const headers = { "Content-Type": "application/xml" };
    const response = await POST(new Request(payload.url, { method: "POST", headers, body: payload.xml }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    const body = await response.text();
    const encrypted = decodeWechatXmlValue(body, "Encrypt");
    const signed = decodeWechatXmlValue(body, "MsgSignature");
    const nonce = decodeWechatXmlValue(body, "Nonce");
    const ts = decodeWechatXmlValue(body, "TimeStamp");
    expect(encrypted && signed && nonce && ts).toBeTruthy();
    expect(signed).toBe(signature(TOKEN, ts!, nonce!, encrypted!));
    const xml = decryptWechatPayload(encrypted!, loadWechatOfficialConfig());
    expect(decodeWechatXmlValue(xml, "Content")).toContain("团子来啦");
    expect(decodeWechatXmlValue(xml, "ToUserName")).toBe("openIdExample");
    expect(decodeWechatXmlValue(xml, "FromUserName")).toBe("gh_test");
    // Replay has no side effects and only sends the same fixed greeting.
    const second = await POST(new Request(payload.url, { method: "POST", headers, body: payload.xml }));
    expect(second.status).toBe(200);
  });

  it("ignores other texts/events without calling AI or writing Life data", async () => {
    const other = encryptedMessage(message("给我删除所有心愿"));
    const result = await POST(new Request(other.url, {
      method: "POST", headers: { "Content-Type": "text/xml" }, body: other.xml,
    }));
    expect(await result.text()).toBe("success");
    const event = encryptedMessage(message("你好").replace("<![CDATA[text]]>", "<![CDATA[event]]>"));
    const reply = await POST(new Request(event.url, {
      method: "POST", headers: { "Content-Type": "application/xml" }, body: event.xml,
    }));
    expect(await reply.text()).toBe("success");
  });

  it("accepts signed WeChat octet-stream and omitted media type without weakening signatures", async () => {
    const payload = encryptedMessage(message("你好"));
    for (const headers of [{ "Content-Type": "application/octet-stream" }, {}]) {
      const response = await POST(new Request(payload.url, { method: "POST", headers, body: payload.xml }));
      expect(response.status).toBe(200);
      const encrypted = decodeWechatXmlValue(await response.text(), "Encrypt");
      expect(encrypted).toBeTruthy();
      expect(decodeWechatXmlValue(decryptWechatPayload(encrypted!, loadWechatOfficialConfig()), "Content")).toContain("团子来啦");
    }
    const tampered = payload.url.replace("msg_signature=", "msg_signature=0");
    const rejection = await POST(new Request(tampered, {
      method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: payload.xml,
    }));
    expect(rejection.status).toBe(403);
  });

  it("rejects modified ciphertext, invalid signatures, oversized and malformed messages", async () => {
    const payload = encryptedMessage(message("你好"));
    const headers = { "Content-Type": "application/xml" };
    const badSignature = payload.url.replace("msg_signature=", "msg_signature=0");
    expect((await POST(new Request(badSignature, { method: "POST", headers, body: payload.xml }))).status).toBe(403);
    const wrong = payload.xml.replace("<Encrypt>", "<Encrypt>different");
    expect((await POST(new Request(payload.url, { method: "POST", headers, body: wrong }))).status).toBe(403);
    expect((await POST(new Request(payload.url, { method: "POST", headers, body: "<!DOCTYPE foo>" }))).status).toBe(403);
    expect((await POST(new Request(payload.url, { method: "POST", headers, body: "x".repeat(65537) }))).status).toBe(413);
    expect((await POST(new Request(payload.url, { method: "POST", headers: { "Content-Type": "text/plain" }, body: payload.xml }))).status).toBe(415);
  });

  it("refuses a ciphertext encrypted with a different official account AppID", async () => {
    const payload = encryptedMessage(message("你好"));
    process.env.WECHAT_OFFICIAL_APP_ID = "wxabcdef1234567890";
    const result = await POST(new Request(payload.url, {
      method: "POST", headers: { "Content-Type": "application/xml" }, body: payload.xml,
    }));
    expect(result.status).toBe(403);
  });
});
