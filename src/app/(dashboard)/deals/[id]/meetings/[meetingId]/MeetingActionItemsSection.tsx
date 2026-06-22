"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import type { ActionItem } from "@/domain/models/meeting";

type Props = {
  meetingId: string;
  dealId: string;
  actionItems: ActionItem[];
  editable: boolean;
};

const boundUpdateMeetingAction = updateMeetingAction.bind(null, {});

export function MeetingActionItemsSection({ meetingId, dealId, actionItems, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(index: number) {
    if (!editable || isPending) return;

    const updatedItems = actionItems.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );

    startTransition(async () => {
      const formData = new FormData();
      formData.set("meetingId", meetingId);
      formData.set("dealId", dealId);
      formData.set("actionItems", JSON.stringify(updatedItems));
      await boundUpdateMeetingAction(formData);
      router.refresh();
    });
  }

  if (actionItems.length === 0) {
    return <p className="text-xs text-text-muted">アクションアイテムはありません</p>;
  }

  return (
    <ul className="text-xs space-y-1">
      {actionItems.map((item, idx) => (
        <li key={idx} className="flex gap-2 items-start">
          <input
            type="checkbox"
            checked={item.done}
            disabled={!editable || isPending}
            onChange={() => handleToggle(idx)}
            className="mt-0.5 cursor-pointer disabled:cursor-default"
          />
          <span className={item.done ? "text-text-muted line-through flex-1" : "text-text flex-1"}>
            {item.description}
          </span>
          <span className="text-text-muted shrink-0">（{item.assignee}）</span>
          {item.dueDate && (
            <span className="text-text-muted shrink-0">{item.dueDate}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
