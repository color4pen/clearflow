"use client";

import { useState, useEffect } from "react";
import { searchLinkTargetsAction } from "@/app/actions/actionItems";
import { DataTable } from "@/app/components";
import type { LinkTargetResult } from "@/application/usecases";

export type LinkTarget = {
  type: "deal" | "inquiry" | "meeting";
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  initialValue: LinkTarget | null;
  onConfirm: (value: LinkTarget | null) => void;
  onCancel: () => void;
};

type ContentProps = {
  initialValue: LinkTarget | null;
  onConfirm: (value: LinkTarget | null) => void;
  onCancel: () => void;
};

const TAB_LABELS: Record<"deal" | "inquiry" | "meeting", string> = {
  deal: "案件",
  inquiry: "引合",
  meeting: "商談",
};

/**
 * Outer wrapper: conditionally renders the modal content.
 * When `open` is false the inner component unmounts, so its state resets
 * automatically. When it reopens it mounts fresh with the correct initial
 * values — no effect-based reset or render-time ref access required.
 */
export function LinkTargetPicker({ open, initialValue, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <LinkTargetPickerContent
      initialValue={initialValue}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

/** Inner component: always mounted when the modal is visible. */
function LinkTargetPickerContent({ initialValue, onConfirm, onCancel }: ContentProps) {
  const [activeTab, setActiveTab] = useState<"deal" | "inquiry" | "meeting">(
    initialValue?.type ?? "deal"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LinkTargetResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timerId = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchLinkTargetsAction({ type: activeTab, query });
      setIsSearching(false);
      if (result.data) {
        setResults(result.data);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timerId);
  }, [query, activeTab]);

  function handleTabChange(tab: "deal" | "inquiry" | "meeting") {
    setActiveTab(tab);
    setQuery("");
    setResults([]);
  }

  function handleSelect(row: LinkTargetResult) {
    onConfirm({
      type: activeTab,
      id: row.id,
      label: row.secondary ? `${row.secondary} / ${row.primary}` : row.primary,
    });
  }

  const columns = [
    {
      key: "secondary",
      header: activeTab === "meeting" ? "案件 / 引合" : "顧客",
      render: (row: LinkTargetResult) => row.secondary ?? "—",
    },
    {
      key: "primary",
      header: activeTab === "meeting" ? "日時・種別" : "タイトル",
      render: (row: LinkTargetResult) => row.primary,
    },
    {
      key: "open",
      header: "",
      align: "right" as const,
      // 行クリックは選択。リンクは別タブで対象画面を開く（選択と競合させない）
      render: (row: LinkTargetResult) =>
        row.href ? (
          <a
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary underline whitespace-nowrap"
          >
            開く ↗
          </a>
        ) : null,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
      onClick={onCancel}
    >
      <div
        className="bg-bg-surface border border-border rounded p-4 shadow-md w-full"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-bold text-text mb-3">紐づけ先を選択</p>

        {/* タブ */}
        <div className="flex gap-0 border-b border-border mb-3">
          {(["deal", "inquiry", "meeting"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`text-xs px-4 py-2 border-b-2 cursor-pointer ${
                activeTab === tab
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* 検索ボックス */}
        <div className="mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${TAB_LABELS[activeTab]}を検索...`}
            className="w-full text-xs border border-border rounded px-2 py-1.5 bg-bg-surface text-text outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* 結果一覧。ヘッダーを常時表示するためテーブルは常に描画し、
            取得中・該当なしの状態はテーブルを差し替えず下にメッセージとして出す */}
        <div className="h-[360px] overflow-y-auto">
          <DataTable<LinkTargetResult>
            columns={columns}
            rows={results}
            rowKey={(row) => row.id}
            onRowClick={handleSelect}
          />
          {isSearching ? (
            <p className="text-xs text-text-muted px-1 py-2">検索中...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-text-muted px-1 py-2">
              {query ? "該当する結果がありません" : "キーワードを入力して検索してください"}
            </p>
          ) : null}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2 justify-between mt-4 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="text-xs text-text-muted underline cursor-pointer hover:text-text"
          >
            なし（紐づけを外す）
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
