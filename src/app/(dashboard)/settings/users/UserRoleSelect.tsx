"use client";

import { useState } from "react";
import { updateUserRoleAction } from "@/app/actions/users";

type Role = "admin" | "member" | "manager" | "finance";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "admin", label: "管理者" },
  { value: "manager", label: "マネージャー" },
  { value: "finance", label: "経理" },
  { value: "member", label: "メンバー" },
];

type Props = {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
};

export function UserRoleSelect({ userId, currentRole, disabled = false }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    if (newRole === currentRole) return;

    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", newRole);

    try {
      const result = await updateUserRoleAction(formData);
      if (!result.success) {
        setError(result.message ?? "エラーが発生しました");
      }
    } catch {
      setError("エラーが発生しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <select
        defaultValue={currentRole}
        onChange={handleChange}
        disabled={disabled || pending}
        className="block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
