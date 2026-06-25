"use client";

import { FormField, Select, Input } from "@/app/components";

type User = { id: string; name: string };

type Props = {
  orgUsers: User[];
  actorId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  actionOptions: Array<{ value: string; label: string }>;
  targetTypeOptions: Array<{ value: string; label: string }>;
};

export function AuditLogFilter({
  orgUsers,
  actorId,
  action,
  targetType,
  startDate,
  endDate,
  actionOptions,
  targetTypeOptions,
}: Props) {
  return (
    <form method="get" className="bg-bg-toolbar border border-border border-t-0 px-2 py-1 mb-0">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 items-end">
        <FormField label="操作者" htmlFor="actorId">
          <Select
            id="actorId"
            name="actorId"
            defaultValue={actorId ?? ""}
          >
            <option value="">すべて</option>
            {orgUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="操作種別" htmlFor="action">
          <Select
            id="action"
            name="action"
            defaultValue={action ?? ""}
          >
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="対象種別" htmlFor="targetType">
          <Select
            id="targetType"
            name="targetType"
            defaultValue={targetType ?? ""}
          >
            {targetTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-1">
          <FormField label="開始日" htmlFor="startDate">
            <Input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDate ?? ""}
            />
          </FormField>
          <FormField label="終了日" htmlFor="endDate">
            <Input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDate ?? ""}
            />
          </FormField>
        </div>
      </div>
      <div className="flex justify-end mt-1 mb-1">
        <button
          type="submit"
          className="bg-primary text-white text-xs px-3 py-1.5 rounded font-medium"
        >
          絞り込み
        </button>
      </div>
    </form>
  );
}
