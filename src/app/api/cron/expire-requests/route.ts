import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { expireOverdueRequests } from "@/application/usecases";

export async function POST(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length);

  // タイミング攻撃防止: 長さが一致しない場合は timingSafeEqual を呼び出さずに 401 を返す
  const tokenBuf = Buffer.from(token);
  const secretBuf = Buffer.from(cronSecret);
  if (tokenBuf.length !== secretBuf.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!timingSafeEqual(tokenBuf, secretBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireOverdueRequests();
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  return NextResponse.json({
    expired: result.expired,
    failed: result.failed,
    errors: result.errors,
  });
}
