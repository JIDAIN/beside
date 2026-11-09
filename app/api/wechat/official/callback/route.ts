import { NextResponse } from "next/server";
import {
  WechatCallbackError,
  decodeWechatXmlValue,
  decryptWechatPayload,
  encryptWechatReply,
  loadWechatOfficialConfig,
  makeWechatTextReply,
  verifyWechatSignature,
} from "@/lib/server/wechat-official-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
const WELCOME = "主人主人～团子来啦！💕\n这里是伴岛 Beside。我们已经连上微信啦～现在先试运行简单问候，生活记录和 AI 操作还没有开放哦。";

function textResponse(body: string, status = 200, type = "text/plain; charset=utf-8") {
  return new Response(body, {
    status,
    headers: { ...NO_STORE, "Content-Type": type },
  });
}

function query(request: Request) {
  const url = new URL(request.url);
  return {
    timestamp: url.searchParams.get("timestamp") || "",
    nonce: url.searchParams.get("nonce") || "",
    signature: url.searchParams.get("signature") || "",
    messageSignature: url.searchParams.get("msg_signature") || "",
    encryptedType: url.searchParams.get("encrypt_type") || "",
    echo: url.searchParams.get("echostr") || "",
  };
}

function reject(error: unknown) {
  const code = error instanceof WechatCallbackError ? error.code : "invalid";
  return textResponse(code === "configuration" ? "service unavailable" : "invalid callback",
    code === "configuration" ? 503 : 403);
}

/** WeChat Official Account initial server URL handshake. No Life auth or writes. */
export async function GET(request: Request) {
  try {
    const config = loadWechatOfficialConfig();
    const q = query(request);
    if (!q.echo || q.echo.length > 100_000) return textResponse("invalid callback", 400);
    // Official Accounts normally use plaintext signature on GET even when
    // message encryption is configured to secure mode.
    if (verifyWechatSignature(config.token, q.timestamp, q.nonce, q.signature)) {
      return textResponse(q.echo);
    }
    // Accept encrypted challenge when the upstream actually supplies a signed one.
    if (q.messageSignature && verifyWechatSignature(config.token, q.timestamp, q.nonce, q.messageSignature, q.echo)) {
      return textResponse(decryptWechatPayload(q.echo, config));
    }
    return textResponse("invalid callback", 403);
  } catch (error) {
    return reject(error);
  }
}

/**
 * Stateless V1: authenticate and decrypt, then answer only a small deterministic
 * greeting. Repeated deliveries cannot cause duplicate Life mutations because
 * the handler performs no writes, notifications, AI calls or user binding.
 */
export async function POST(request: Request) {
  try {
    const config = loadWechatOfficialConfig();
    const q = query(request);
    if (q.encryptedType !== "aes" || !q.messageSignature) return textResponse("invalid callback", 403);
    if (!/^(application\/xml|text\/xml)(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) {
      return textResponse("unsupported media type", 415);
    }
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 64 * 1024) return textResponse("request too large", 413);
    const encrypted = decodeWechatXmlValue(body, "Encrypt");
    if (!encrypted || !verifyWechatSignature(config.token, q.timestamp, q.nonce, q.messageSignature, encrypted)) {
      return textResponse("invalid callback", 403);
    }
    const decrypted = decryptWechatPayload(encrypted, config);
    const sender = decodeWechatXmlValue(decrypted, "FromUserName");
    const receiver = decodeWechatXmlValue(decrypted, "ToUserName");
    const messageType = decodeWechatXmlValue(decrypted, "MsgType");
    const content = decodeWechatXmlValue(decrypted, "Content");

    if (!sender || !receiver || !messageType) return textResponse("invalid callback", 400);
    // Non-text / non-greeting messages have no actions and require no reply.
    if (messageType !== "text" || !content || !["你好", "hello", "hi"].includes(content.trim().toLowerCase())) {
      return textResponse("success");
    }
    const reply = makeWechatTextReply(sender, receiver, WELCOME);
    return textResponse(encryptWechatReply(reply, config), 200, "application/xml; charset=utf-8");
  } catch (error) {
    return reject(error);
  }
}
