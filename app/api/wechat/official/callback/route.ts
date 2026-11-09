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
type CallbackStage = "configuration" | "query" | "media" | "size" | "signature" | "decrypt" | "fields" | "ignored" | "replied" | "error";

/** Privacy-safe diagnostics: never log request URLs, bodies, identifiers, ciphertext or secrets. */
function callbackLog(stage: CallbackStage, status: number) {
  console.info("wechat_official_callback", { stage, status });
}

function rejectPost(stage: CallbackStage, status: number, message = "invalid callback") {
  callbackLog(stage, status);
  return textResponse(message, status);
}


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
  let stage: CallbackStage = "configuration";
  try {
    const config = loadWechatOfficialConfig();
    stage = "query";
    const q = query(request);
    if (q.encryptedType !== "aes" || !q.messageSignature) return rejectPost(stage, 403);
    stage = "media";
    // WeChat may use text/xml, application/xml, application/octet-stream, or
    // omit Content-Type. Treat the signed and size-limited XML body as authoritative.
    const mediaType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (mediaType && !["application/xml", "text/xml", "application/octet-stream"].includes(mediaType)) {
      return rejectPost(stage, 415, "unsupported media type");
    }
    stage = "size";
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 64 * 1024) return rejectPost(stage, 413, "request too large");
    stage = "signature";
    const encrypted = decodeWechatXmlValue(body, "Encrypt");
    if (!encrypted || !verifyWechatSignature(config.token, q.timestamp, q.nonce, q.messageSignature, encrypted)) {
      return rejectPost(stage, 403);
    }
    stage = "decrypt";
    const decrypted = decryptWechatPayload(encrypted, config);
    stage = "fields";
    const sender = decodeWechatXmlValue(decrypted, "FromUserName");
    const receiver = decodeWechatXmlValue(decrypted, "ToUserName");
    const messageType = decodeWechatXmlValue(decrypted, "MsgType");
    const content = decodeWechatXmlValue(decrypted, "Content");

    if (!sender || !receiver || !messageType) return rejectPost(stage, 400);
    if (messageType !== "text" || !content || !["你好", "hello", "hi"].includes(content.trim().toLowerCase())) {
      callbackLog("ignored", 200);
      return textResponse("success");
    }
    const reply = makeWechatTextReply(sender, receiver, WELCOME);
    const encryptedReply = encryptWechatReply(reply, config);
    callbackLog("replied", 200);
    return textResponse(encryptedReply, 200, "application/xml; charset=utf-8");
  } catch (error) {
    const response = reject(error);
    callbackLog(error instanceof WechatCallbackError && error.code === "configuration" ? "configuration" : stage, response.status);
    return response;
  }
}
