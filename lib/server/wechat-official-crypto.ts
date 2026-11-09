import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export type WechatOfficialConfig = {
  appId: string;
  token: string;
  aesKey: Buffer;
};

export class WechatCallbackError extends Error {
  constructor(public readonly code: "invalid" | "configuration" | "unauthorized", message: string) {
    super(message);
  }
}

const MAX_XML_BYTES = 64 * 1024;
const SAFE_STRING = /^[\w-]{1,128}$/;
const AES_KEY = /^[a-zA-Z0-9+/]{43}$/;

export function loadWechatOfficialConfig(env: NodeJS.ProcessEnv = process.env): WechatOfficialConfig {
  const appId = env.WECHAT_OFFICIAL_APP_ID?.trim() ?? "";
  const token = env.WECHAT_OFFICIAL_TOKEN?.trim() ?? "";
  const encodingAesKey = env.WECHAT_OFFICIAL_ENCODING_AES_KEY?.trim() ?? "";
  if (!/^wx[a-zA-Z0-9]{16}$/.test(appId) || !SAFE_STRING.test(token)
    || token.length < 3 || token.length > 32 || !AES_KEY.test(encodingAesKey)) {
    throw new WechatCallbackError("configuration", "微信回调服务尚未配置");
  }
  const aesKey = Buffer.from(encodingAesKey + "=", "base64");
  if (aesKey.length !== 32) {
    throw new WechatCallbackError("configuration", "微信回调密钥格式不正确");
  }
  return { appId, token, aesKey };
}

function sha1(parts: string[]) {
  return createHash("sha1").update([...parts].sort().join(""), "utf8").digest("hex");
}

function equalDigest(left: string, right: string) {
  if (!/^[0-9a-f]{40}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right.toLowerCase(), "hex"));
}

export function verifyWechatSignature(token: string, timestamp: string, nonce: string, signature: string, encrypted?: string) {
  if (!/^\d{10}$/.test(timestamp) || !SAFE_STRING.test(nonce)) return false;
  // Reject significantly old/future callback requests. Clock synchronization
  // should be enabled on the server; no long-term replay state is persisted.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const calculated = sha1(encrypted === undefined
    ? [token, timestamp, nonce]
    : [token, timestamp, nonce, encrypted]);
  return equalDigest(calculated, signature);
}

export function decodeWechatXmlValue(xml: string, tag: string): string | null {
  if (Buffer.byteLength(xml, "utf8") > MAX_XML_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(tag)) return null;
  const matches = [...xml.matchAll(new RegExp("<" + tag + ">([\\s\\S]*?)<\\/" + tag + ">", "g"))];
  if (matches.length !== 1) return null;
  const raw = matches[0][1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) return cdata[1];
  if (raw.includes("<") || raw.includes(">")) return null;
  return raw.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) =>
    ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[name as "amp"]);
}

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function pkcs7Pad(source: Buffer) {
  const size = 32 - (source.length % 32);
  return Buffer.concat([source, Buffer.alloc(size, size)]);
}

function pkcs7Unpad(source: Buffer) {
  const pad = source[source.length - 1];
  if (!pad || pad > 32 || pad > source.length) throw new WechatCallbackError("invalid", "微信加密消息无效");
  const tail = source.subarray(source.length - pad);
  if (!tail.every((byte) => byte === pad)) throw new WechatCallbackError("invalid", "微信加密消息无效");
  return source.subarray(0, source.length - pad);
}

export function decryptWechatPayload(encrypted: string, config: WechatOfficialConfig): string {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encrypted) || encrypted.length > 100_000) {
    throw new WechatCallbackError("invalid", "微信加密消息无效");
  }
  try {
    const decipher = createDecipheriv("aes-256-cbc", config.aesKey, config.aesKey.subarray(0, 16));
    decipher.setAutoPadding(false);
    const decoded = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]);
    const unpadded = pkcs7Unpad(decoded);
    if (unpadded.length < 20) throw new Error("short");
    const length = unpadded.readUInt32BE(16);
    const end = 20 + length;
    if (length <= 0 || end > unpadded.length || length > MAX_XML_BYTES) throw new Error("length");
    if (unpadded.subarray(end).toString("utf8") !== config.appId) {
      throw new Error("appid mismatch");
    }
    return unpadded.subarray(20, end).toString("utf8");
  } catch {
    throw new WechatCallbackError("invalid", "微信加密消息无效");
  }
}

export function encryptWechatPayload(plaintext: string, config: WechatOfficialConfig) {
  const message = Buffer.from(plaintext, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(message.length);
  const payload = pkcs7Pad(Buffer.concat([randomBytes(16), length, message, Buffer.from(config.appId)]));
  const cipher = createCipheriv("aes-256-cbc", config.aesKey, config.aesKey.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(payload), cipher.final()]).toString("base64");
}

export function encryptWechatReply(plaintext: string, config: WechatOfficialConfig, timestamp = String(Math.floor(Date.now() / 1000)), nonce = randomBytes(12).toString("hex")) {
  const encrypted = encryptWechatPayload(plaintext, config);
  const signature = sha1([config.token, timestamp, nonce, encrypted]);
  return '<xml><Encrypt><![CDATA[' + encrypted + ']]></Encrypt>'
    + '<MsgSignature><![CDATA[' + signature + ']]></MsgSignature>'
    + '<TimeStamp>' + timestamp + '</TimeStamp>'
    + '<Nonce><![CDATA[' + nonce + ']]></Nonce></xml>';
}

export function makeWechatTextReply(senderOpenId: string, receiverAppId: string, content: string, at = Math.floor(Date.now() / 1000)) {
  if (!/^[-\w]{1,128}$/.test(senderOpenId) || !/^[-\w]{1,128}$/.test(receiverAppId)) {
    throw new WechatCallbackError("invalid", "微信消息账号字段不正确");
  }
  return '<xml><ToUserName>' + xmlEscape(senderOpenId) + '</ToUserName>'
    + '<FromUserName>' + xmlEscape(receiverAppId) + '</FromUserName>'
    + '<CreateTime>' + at + '</CreateTime><MsgType><![CDATA[text]]></MsgType>'
    + '<Content><![CDATA[' + content.replace(/]]>/g, "]]]]><![CDATA[>") + ']]></Content></xml>';
}
