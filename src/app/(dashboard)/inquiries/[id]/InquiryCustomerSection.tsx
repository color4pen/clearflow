"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateInquiryAction } from "@/app/actions/inquiries";
import { Select, Input } from "@/app/components";

type Props = {
  inquiryId: string;
  /** Needed to satisfy updateInquiryAction's required fields */
  inquiryTitle: string;
  inquirySource: string;
  inquiryDescription: string | null;
  inquiryContactNote: string | null;
  clientId: string | null;
  clientName: string | null;
  clientLinkId: string | null;
  clients: Array<{ id: string; name: string }>;
  editable: boolean;
};

export function InquiryCustomerSection({
  inquiryId,
  inquiryTitle,
  inquirySource,
  inquiryDescription,
  inquiryContactNote,
  clientId,
  clientName,
  clientLinkId,
  clients,
  editable,
}: Props) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [newClientName, setNewClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    // Required fields for updateInquiryAction
    formData.set("title", inquiryTitle);
    formData.set("source", inquirySource);
    if (inquiryDescription) formData.set("description", inquiryDescription);
    if (inquiryContactNote) formData.set("contactNote", inquiryContactNote);

    if (clientMode === "new" && newClientName.trim()) {
      formData.set("newClientName", newClientName.trim());
    } else if (selectedClientId && selectedClientId !== "__new__" && selectedClientId !== "") {
      formData.set("clientId", selectedClientId);
    }

    const result = await updateInquiryAction(inquiryId, {}, formData);
    setIsSubmitting(false);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  const canSave =
    (selectedClientId !== "" && selectedClientId !== "__new__") ||
    (clientMode === "new" && newClientName.trim() !== "");

  return (
    <div>
      <h2 className="text-xs font-bold text-text mb-2">顧客</h2>

      {clientId && clientLinkId ? (
        <Link
          href={`/clients/${clientLinkId}`}
          className="text-primary underline text-xs px-2 py-1 inline-block"
        >
          {clientName}
        </Link>
      ) : editable ? (
        <div className="space-y-1">
          <p className="text-xs text-danger mb-1">顧客が設定されていません</p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Select
            name="clientId"
            value={selectedClientId}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setClientMode("new");
              } else {
                setClientMode("existing");
              }
              setSelectedClientId(e.target.value);
            }}
          >
            <option value="">未設定</option>
            <option value="__new__">新規登録</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {clientMode === "new" && (
            <Input
              name="newClientName"
              placeholder="企業名"
              className="mt-1"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
            />
          )}
          {canSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="text-xs font-bold px-3 py-1 bg-primary text-white cursor-pointer disabled:opacity-50 hover:opacity-90 mt-1"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted">顧客が設定されていません</p>
      )}
    </div>
  );
}
