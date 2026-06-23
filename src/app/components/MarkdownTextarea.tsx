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
    <div className="w-full px-2 py-1 text-xs text-text min-h-[4rem]">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold mt-2 mb-0.5">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed mb-1">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => <code className="bg-bg-surface-alt px-1 py-0.5 text-xs rounded">{children}</code>,
          pre: ({ children }) => <pre className="bg-bg-surface-alt p-2 overflow-x-auto rounded mb-1">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-2 text-text-muted mb-1">{children}</blockquote>,
          a: ({ href, children }) => <a href={href} className="text-primary underline">{children}</a>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          hr: () => <hr className="border-border my-2" />,
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
