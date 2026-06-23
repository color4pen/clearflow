"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Textarea } from "./FormField";

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
};

export function MarkdownTextarea({
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  rows = 8,
  placeholder,
}: Props) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");

  const displayValue = value !== undefined ? value : internalValue;

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  }

  if (disabled) {
    return (
      <MarkdownPreview value={displayValue} placeholder={placeholder} />
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-1">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`text-xs pb-0.5 cursor-pointer ${
            activeTab === "edit"
              ? "text-text font-bold border-b border-text"
              : "text-text-muted"
          }`}
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`text-xs pb-0.5 cursor-pointer ${
            activeTab === "preview"
              ? "text-text font-bold border-b border-text"
              : "text-text-muted"
          }`}
        >
          プレビュー
        </button>
      </div>
      {activeTab === "edit" ? (
        <Textarea
          name={name}
          value={value}
          defaultValue={value === undefined ? internalValue : undefined}
          onChange={handleChange}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <>
          {name && <input type="hidden" name={name} value={displayValue} />}
          <MarkdownPreview value={displayValue} placeholder={placeholder} />
        </>
      )}
    </div>
  );
}

function MarkdownPreview({
  value,
  placeholder,
}: {
  value: string;
  placeholder?: string;
}) {
  if (!value) {
    return (
      <div className="w-full px-2 py-1 text-xs text-text-placeholder min-h-[4rem]">
        {placeholder ?? ""}
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-1 text-xs text-text space-y-1.5 min-h-[4rem] [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-0.5 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mt-1 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:leading-relaxed [&_code]:bg-bg-surface-alt [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:rounded [&_pre]:bg-bg-surface-alt [&_pre]:p-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:text-text-muted [&_a]:text-primary [&_a]:underline [&_strong]:font-bold [&_hr]:border-border [&_hr]:my-2">
      <ReactMarkdown remarkPlugins={[remarkBreaks]}>{value}</ReactMarkdown>
    </div>
  );
}
