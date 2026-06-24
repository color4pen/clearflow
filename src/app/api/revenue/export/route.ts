import { auth } from "@/infrastructure/auth";
import { canPerform } from "@/domain/authorization";
import { revenueRepository } from "@/infrastructure/repositories";

function escapeCsvValue(value: string): string {
  // CSV Formula Injection 対策 (CWE-1236)
  if (
    value.startsWith("=") ||
    value.startsWith("+") ||
    value.startsWith("-") ||
    value.startsWith("@")
  ) {
    value = "'" + value;
  }

  // CSV 構造エスケープ
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    value = '"' + value.replace(/"/g, '""') + '"';
  }

  return value;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canPerform(session.user.role, "revenue", "export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const axisParam = searchParams.get("axis");

  if (!startDateParam || !endDateParam) {
    return new Response("startDate and endDate are required", { status: 400 });
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam + "T23:59:59.999Z");

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return new Response("Invalid date format", { status: 400 });
  }

  const axis = axisParam === "customer" || axisParam === "deal" ? axisParam : "monthly";
  const organizationId = session.user.organizationId;

  let header: string;
  let rows: string[];

  if (axis === "monthly") {
    const data = await revenueRepository.getMonthlyRevenue(organizationId, startDate, endDate);
    header = "期間,金額,件数";
    rows = data.map((item) =>
      [
        escapeCsvValue(item.yearMonth),
        escapeCsvValue(String(item.amount)),
        escapeCsvValue(String(item.count)),
      ].join(",")
    );
  } else if (axis === "customer") {
    const data = await revenueRepository.getCustomerRevenue(organizationId, startDate, endDate);
    header = "顧客名,金額,件数";
    rows = data.map((item) =>
      [
        escapeCsvValue(item.clientName),
        escapeCsvValue(String(item.amount)),
        escapeCsvValue(String(item.count)),
      ].join(",")
    );
  } else {
    const data = await revenueRepository.getDealRevenue(organizationId, startDate, endDate);
    header = "案件名,金額,件数";
    rows = data.map((item) =>
      [
        escapeCsvValue(item.dealTitle),
        escapeCsvValue(String(item.amount)),
        escapeCsvValue(String(item.count)),
      ].join(",")
    );
  }

  const BOM = "﻿";
  const csvContent = BOM + [header, ...rows].join("\n");
  const filename = `revenue-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
