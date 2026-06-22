"use client";

import { useState, useRef, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { updateDealAction } from "@/app/actions/deals";
import { SectionCard, Textarea } from "@/app/components";

type Props = {
  dealId: string;
  notes: string | null;
  editable: boolean;
};

export function DealNotesSection({ dealId, notes, editable }: Props) {
  const [value, setValue] = useState(notes ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savingRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);

  const save = useCallback(async (text: string) => {
    if (savingRef.current) {
      pendingTextRef.current = text;
      return;
    }
    savingRef.current = true;
    setSaveStatus("saving");
    const formData = new FormData();
    formData.set("notes", text);
    const result = await updateDealAction(dealId, formData);
    savingRef.current = false;
    if (!result.success) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    if (pendingTextRef.current !== null) {
      const pending = pendingTextRef.current;
      pendingTextRef.current = null;
      save(pending);
    }
  }, [dealId]);

  const debouncedSave = useDebouncedCallback((text: string) => {
    save(text);
  }, 800);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSave(newValue);
  }

  return (
    <SectionCard className="p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">備考</h2>
        {saveStatus === "saving" && <span className="text-text-muted text-xs">保存中...</span>}
        {saveStatus === "saved" && <span className="text-green-600 text-xs">保存済み</span>}
        {saveStatus === "error" && <span className="text-danger text-xs">保存に失敗しました</span>}
      </div>
      <Textarea
        value={value}
        onChange={handleChange}
        rows={6}
        placeholder="案件の状況や共有事項を記入"
        disabled={!editable}
      />
    </SectionCard>
  );
}
