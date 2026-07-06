/**
 * T-18: OAuth メタデータエンドポイントの静的検証
 *
 * - Protected Resource Metadata のレスポンス形式
 * - Authorization Server Metadata のレスポンス形式
 * - WWW-Authenticate ヘッダの存在
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("Protected Resource Metadata (/well-known/oauth-protected-resource)", () => {
  it("route.ts が resource フィールドを含む JSON を返す", async () => {
    const content = await readSrc("app/.well-known/oauth-protected-resource/route.ts");
    expect(content).toContain("resource");
    expect(content).toContain("authorization_servers");
    expect(content).toContain("bearer_methods_supported");
  });

  it("route.ts が GET を export している", async () => {
    const content = await readSrc("app/.well-known/oauth-protected-resource/route.ts");
    expect(content).toContain("export async function GET");
  });

  it("レスポンスが application/json を返す", async () => {
    const { GET } = await import("../../app/.well-known/oauth-protected-resource/route");
    const request = new Request("http://localhost/.well-known/oauth-protected-resource");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(typeof body.resource).toBe("string");
    expect(Array.isArray(body.authorization_servers)).toBe(true);
    expect(Array.isArray(body.bearer_methods_supported)).toBe(true);
    expect(body.bearer_methods_supported).toContain("header");
  });
});

describe("Authorization Server Metadata (/.well-known/oauth-authorization-server)", () => {
  it("route.ts が RFC 8414 必須フィールドを含む JSON を返す", async () => {
    const content = await readSrc("app/.well-known/oauth-authorization-server/route.ts");
    expect(content).toContain("issuer");
    expect(content).toContain("authorization_endpoint");
    expect(content).toContain("token_endpoint");
    expect(content).toContain("registration_endpoint");
    expect(content).toContain("response_types_supported");
    expect(content).toContain("code_challenge_methods_supported");
  });

  it("route.ts が GET を export している", async () => {
    const content = await readSrc("app/.well-known/oauth-authorization-server/route.ts");
    expect(content).toContain("export async function GET");
  });

  it("レスポンスが RFC 8414 準拠の JSON を返す", async () => {
    const { GET } = await import("../../app/.well-known/oauth-authorization-server/route");
    const request = new Request("http://localhost/.well-known/oauth-authorization-server");
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(typeof body.issuer).toBe("string");
    expect(typeof body.authorization_endpoint).toBe("string");
    expect(typeof body.token_endpoint).toBe("string");
    expect(typeof body.registration_endpoint).toBe("string");
    expect(body.response_types_supported).toContain("code");
    expect(body.grant_types_supported).toContain("authorization_code");
    expect(body.grant_types_supported).toContain("refresh_token");
    expect(body.code_challenge_methods_supported).toContain("S256");
    expect(body.token_endpoint_auth_methods_supported).toContain("none");
  });
});

describe("MCP エンドポイントの WWW-Authenticate ヘッダ", () => {
  it("MCP route.ts が WWW-Authenticate ヘッダを設定している", async () => {
    const content = await readSrc("app/api/mcp/route.ts");
    expect(content).toContain("WWW-Authenticate");
    expect(content).toContain("resource_metadata");
  });

  it("認証失敗時の 401 レスポンスに WWW-Authenticate ヘッダが含まれる", async () => {
    const { POST } = await import("../../app/api/mcp/route");
    const request = new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "0.1.0" },
        },
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const wwwAuth = response.headers.get("WWW-Authenticate");
    expect(wwwAuth).not.toBeNull();
    expect(wwwAuth).toContain("Bearer");
    expect(wwwAuth).toContain("resource_metadata");
  });
});
