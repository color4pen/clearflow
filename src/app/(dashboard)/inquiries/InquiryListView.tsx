"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import { statusLabels } from "@/app/(dashboard)/labels";
import { filterInquiries } from "./filterInquiries";
import type { InquiryRow, TabValue } from "./filterInquiries";

const INQUIRY_STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  new: "gray",
  converted: "green",
  declined: "gray",
};

type Props = {
  inquiries: InquiryRow[];
  sources: Array<{ value: string; label: string }>;
};

const TAB_LABELS: { value: TabValue; label: string }[] = [
  { value: "all", label: "全て" },
  { value: "new", label: "新規" },
  { value: "converted", label: "案件化済み" },
  { value: "declined", label: "見送り" },
];

export function InquiryListView({ inquiries, sources }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [sourceFilter, setSourceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () => filterInquiries(inquiries, { activeTab, sourceFilter, searchQuery }),
    [inquiries, activeTab, sourceFilter, searchQuery],
  );

  const gridCols = "1.7fr 1fr 110px 160px 110px";

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-2 py-2 bg-bg-toolbar border border-border border-t-0">
        {/* Status tabs */}
        <div className="flex items-center gap-1">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`text-xs px-3 py-1 border cursor-pointer ${
                activeTab === tab.value
                  ? "bg-primary text-white border-primary font-bold"
                  : "bg-bg-surface text-text border-border hover:bg-bg-toolbar"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source dropdown */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs border border-border px-2 py-1 bg-bg-surface text-text"
        >
          <option value="">全ての経路</option>
          {sources.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Search input - right aligned */}
        <div className="ml-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="顧客名・件名で検索"
            className="text-xs border border-border px-2 py-1 bg-bg-surface text-text w-52"
          />
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid bg-bg-toolbar border border-border border-t-0 text-xs text-text-muted font-bold"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="px-[14px] py-[10px]">件名</div>
        <div className="px-[14px] py-[10px]">顧客名</div>
        <div className="px-[14px] py-[10px]">経路</div>
        <div className="px-[14px] py-[10px]">ステータス</div>
        <div className="px-[14px] py-[10px] text-right">登録日</div>
      </div>

      {/* Table rows */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-text-disabled text-sm bg-bg-surface border border-border border-t-0">
          <p>該当する引合はありません</p>
        </div>
      ) : (
        <>
          {filtered.map((row, index) => (
            <div
              key={row.id}
              className={`grid text-xs border border-border border-t-0 hover:bg-bg-toolbar ${
                index % 2 === 0 ? "bg-bg-surface" : "bg-[#fafafa]"
              }`}
              style={{ gridTemplateColumns: gridCols }}
            >
              {/* 件名 */}
              <div className="px-[14px] py-[10px]">
                <Link
                  href={`/inquiries/${row.id}`}
                  className="text-primary underline"
                >
                  {row.title}
                </Link>
              </div>

              {/* 顧客名 */}
              <div className="px-[14px] py-[10px] text-text">
                {row.clientName ?? "-"}
              </div>

              {/* 経路 */}
              <div className="px-[14px] py-[10px] text-text">
                {sources.find((s) => s.value === row.source)?.label ?? row.source}
              </div>

              {/* ステータス */}
              <div className="px-[14px] py-[10px] flex items-center gap-2">
                <StatusBadge variant={INQUIRY_STATUS_VARIANT[row.status] ?? "gray"}>
                  {statusLabels[row.status] ?? row.status}
                </StatusBadge>
                {row.status === "converted" && row.dealId && (
                  <Link
                    href={`/deals/${row.dealId}`}
                    className="text-primary underline text-xs"
                  >
                    → 案件
                  </Link>
                )}
                {row.status === "converted" && !row.dealId && (
                  <Link
                    href={`/deals?inquiryId=${row.id}`}
                    className="text-primary underline text-xs"
                  >
                    → 案件
                  </Link>
                )}
              </div>

              {/* 登録日 */}
              <div className="px-[14px] py-[10px] text-right font-mono text-text-muted">
                {new Date(row.createdAt).toLocaleDateString("ja-JP")}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Footer */}
      <div className="text-xs text-text-muted px-3 py-2 bg-bg-surface border border-border border-t-0">
        {filtered.length} 件
      </div>
    </div>
  );
}
