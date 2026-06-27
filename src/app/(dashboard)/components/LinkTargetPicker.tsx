"use client";

import { useState, useEffect, useRef } from "react";
import { searchLinkTargetsAction } from "@/app/actions/actionItems";

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

const TAB_LABELS: Record<"deal" | "inquiry" | "meeting", string> = {
  deal: "案件",
  inquiry: "引合",
  meeting: "会議",
};

export function LinkTargetPicker({ open, initialValue, onConfirm, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<"deal" | "inquiry" | "meeting">(
    initialValue?.type ?? "deal"
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Reset state when the modal transitions from closed to open.
  // Calling setState during render (guarded by a ref) avoids the extra
  // render cycle that synchronous setState inside useEffect would cause.
  const prevOpenRef = useRef(open);
  if (open && !prevOpenRef.current) {
    setActiveTab(initialValue?.type ?? "deal");
    setQuery("");
    setResults([]);
  }
  prevOpenRef.current = open;

  useEffect(() => {
    if (!open) return;

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
  }, [query, activeTab, open]);

  if (!open) return null;

  function handleTabChange(tab: "deal" | "inquiry" | "meeting") {
    setActiveTab(tab);
    setQuery("");
    setResults([]);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
      onClick={onCancel}
    >
      <div
        className="bg-bg-surface border border-border rounded p-4 shadow-md w-full"
        style={{ maxWidth: 480 }}
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

        {/* 結果一覧 */}
        <div className="min-h-[120px] max-h-[240px] overflow-y-auto">
          {isSearching ? (
            <p className="text-xs text-text-muted px-1 py-2">検索中...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-text-muted px-1 py-2">
              {query ? "該当する結果がありません" : "キーワードを入力して検索してください"}
            </p>
          ) : (
            <ul className="divide-y divide-border-light">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onConfirm({ type: activeTab, id: item.id, label: item.label })
                    }
                    className="w-full text-left text-xs px-2 py-2 hover:bg-bg-surface-alt text-text cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
