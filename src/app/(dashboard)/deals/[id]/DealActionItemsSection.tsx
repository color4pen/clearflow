"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import type { ActionItem } from "@/domain/models/meeting";

type FlatItem = {
  meetingId: string;
  dealId: string;
  meetingLabel: string;
  actionItem: ActionItem;
  index: number;
};

type MeetingActionItems = {
  meetingId: string;
  dealId: string;
  actionItems: ActionItem[];
};

type Props = {
  items: FlatItem[];
  allMeetingActionItems: MeetingActionItems[];
  editable: boolean;
};

const boundUpdateMeetingAction = updateMeetingAction.bind(null, {});

export function DealActionItemsSection({ items, allMeetingActionItems, editable }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle(meetingId: string, dealId: string, index: number) {
    if (!editable || isPending) return;
    const meetingData = allMeetingActionItems.find((m) => m.meetingId === meetingId);
    if (!meetingData) return;

    const updatedItems = meetingData.actionItems.map((item, i) =>
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

  if (items.length === 0) {
    return <p className="text-xs text-text-muted">アクションアイテムはありません</p>;
  }

  return (
    <ul className="text-xs space-y-1">
      {items.map((flat, i) => (
        <li key={`${flat.meetingId}-${flat.index}`} className="flex gap-2 items-start">
          <input
            type="checkbox"
            checked={flat.actionItem.done}
            disabled={!editable || isPending}
            onChange={() => handleToggle(flat.meetingId, flat.dealId, flat.index)}
            className="mt-0.5 cursor-pointer disabled:cursor-default"
          />
          <span
            className={
              flat.actionItem.done
                ? "text-text-muted line-through flex-1"
                : "text-text flex-1"
            }
          >
            {flat.actionItem.description}
          </span>
          <span className="text-text-muted shrink-0">（{flat.actionItem.assignee}）</span>
          {flat.actionItem.dueDate && (
            <span className="text-text-muted shrink-0">{flat.actionItem.dueDate}</span>
          )}
          <span className="text-text-muted shrink-0 ml-1">[{flat.meetingLabel}]</span>
        </li>
      ))}
    </ul>
  );
}
