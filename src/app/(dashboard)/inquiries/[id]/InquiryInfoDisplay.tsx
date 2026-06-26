"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { sourceLabels } from "@/app/(dashboard)/labels";
import { InquiryInfoSection } from "./InquiryInfoSection";

type Props = {
  inquiry: {
    id: string;
    title: string;
    source: string;
    description: string | null;
    contactNote: string | null;
    clientId: string | null;
    assigneeId: string | null;
    status: string;
  };
  editable: boolean;
};

type MdProps = { children?: React.ReactNode };

const mdComponents = {
  p: ({ children }: MdProps) => <p className="leading-relaxed mb-1">{children}</p>,
  ul: ({ children }: MdProps) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
  ol: ({ children }: MdProps) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
  li: ({ children }: MdProps) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: MdProps) => <strong className="font-bold">{children}</strong>,
  a: ({ href, children }: MdProps & { href?: string }) => <a href={href} className="text-primary underline">{children}</a>,
};

export function InquiryInfoDisplay({ inquiry, editable }: Props) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-xs text-text-muted underline cursor-pointer"
          >
            ← キャンセル
          </button>
        </div>
        <InquiryInfoSection
          inquiry={inquiry}
          editable={editable}
          onSaved={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">基本情報</h2>
        {editable && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-primary underline cursor-pointer"
          >
            編集
          </button>
        )}
      </div>
      <div
        className="text-xs"
        style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "4px 8px" }}
      >
        <div className="text-text-muted py-1">件名</div>
        <div className="text-text py-1">{inquiry.title}</div>

        <div className="text-text-muted py-1">経路</div>
        <div className="text-text py-1">
          {sourceLabels[inquiry.source] ?? inquiry.source}
        </div>

        <div className="text-text-muted py-1">問い合わせ内容</div>
        <div className="text-text py-1">
          {inquiry.contactNote ? (
            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={mdComponents}>
              {inquiry.contactNote}
            </ReactMarkdown>
          ) : "-"}
        </div>

        <div className="text-text-muted py-1">概要</div>
        <div className="text-text py-1">
          {inquiry.description ? (
            <ReactMarkdown remarkPlugins={[remarkBreaks]} components={mdComponents}>
              {inquiry.description}
            </ReactMarkdown>
          ) : "-"}
        </div>
      </div>
    </div>
  );
}
