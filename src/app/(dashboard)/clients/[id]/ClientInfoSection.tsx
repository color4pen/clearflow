"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientAction } from "@/app/actions/clients";
import type { UpdateClientState } from "@/app/actions/clients";
import { Input, Textarea, preventEnterSubmit } from "@/app/components";

type ClientInfo = {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
};

type Props = {
  client: ClientInfo;
  editable: boolean;
};

export function ClientInfoSection({ client, editable }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  function markDirty() {
    setIsDirty(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const boundAction = updateClientAction.bind(null, client.id);
    const result: UpdateClientState = await boundAction({}, formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsDirty(false);
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">企業情報</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          {editable && (
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
              className={`text-xs font-bold px-3 py-1 ${
                isDirty
                  ? "bg-primary text-white cursor-pointer hover:opacity-90"
                  : "bg-bg-toolbar border border-border text-text-muted cursor-not-allowed"
              } disabled:opacity-50`}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          )}
        </div>
      </div>
      <dl className="text-xs space-y-1">
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">企業名</dt>
          <dd className="text-text flex-1">
            <Input name="name" defaultValue={client.name} disabled={!editable} onChange={markDirty} required />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">業種</dt>
          <dd className="text-text flex-1">
            <Input name="industry" defaultValue={client.industry ?? ""} disabled={!editable} onChange={markDirty} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">規模</dt>
          <dd className="text-text flex-1">
            <Input name="size" defaultValue={client.size ?? ""} disabled={!editable} onChange={markDirty} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">所在地</dt>
          <dd className="text-text flex-1">
            <Input name="address" defaultValue={client.address ?? ""} disabled={!editable} onChange={markDirty} />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">備考</dt>
          <dd className="text-text flex-1">
            <Textarea
              name="notes"
              defaultValue={client.notes ?? ""}
              disabled={!editable}
              onChange={markDirty}
              rows={3}
              style={{ whiteSpace: "pre-wrap" }}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-text-muted w-20 shrink-0">登録日</dt>
          <dd className="text-text px-2 py-1">{client.createdAt.toLocaleDateString("ja-JP")}</dd>
        </div>
      </dl>
    </form>
  );
}
