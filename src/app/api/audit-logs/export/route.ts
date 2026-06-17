import { auth } from "@/infrastructure/auth";
import { auditLogRepository } from "@/infrastructure/repositories";

function escapeCsvValue(value: string): string {
  // CSV Formula Injection 対策 (CWE-1236)
  if (value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")) {
    value = "'" + value;
  }

  // CSV 構造エスケープ
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let action: string | undefined;

  const startDateParam = searchParams.get("startDate");
  if (startDateParam) {
    const d = new Date(startDateParam);
    if (!isNaN(d.getTime())) {
      startDate = d;
    }
  }

  const endDateParam = searchParams.get("endDate");
  if (endDateParam) {
    const d = new Date(endDateParam);
    if (!isNaN(d.getTime())) {
      endDate = d;
    }
  }

  const actionParam = searchParams.get("action");
  if (actionParam) {
    action = actionParam;
  }

  const logs = await auditLogRepository.findByOrganization(session.user.organizationId, {
    startDate,
    endDate,
    action,
  });

  const BOM = "﻿";
  const header = "timestamp,action,targetType,targetId,actorId,metadata";
  const rows = logs.map((log) => {
    const cols = [
      escapeCsvValue(log.createdAt.toISOString()),
      escapeCsvValue(log.action),
      escapeCsvValue(log.targetType),
      escapeCsvValue(log.targetId),
      escapeCsvValue(log.actorId),
      escapeCsvValue(JSON.stringify(log.metadata ?? {})),
    ];
    return cols.join(",");
  });

  const csvContent = BOM + [header, ...rows].join("\n");

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
