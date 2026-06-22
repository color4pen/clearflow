"use client";

import { createDelegationAction } from "@/app/actions/delegations";
import { FormField, Select, Input, SubmitButton, preventEnterSubmit } from "@/app/components";

type OrgUser = {
  id: string;
  name: string;
  role: string;
};

type Props = {
  orgUsers: OrgUser[];
};

export function AddDelegationForm({ orgUsers }: Props) {
  return (
    <form
      action={async (formData: FormData) => {
        await createDelegationAction(formData);
      }}
      onKeyDown={preventEnterSubmit}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="委譲元ユーザー" htmlFor="fromUserId">
          <Select
            id="fromUserId"
            name="fromUserId"
            required
            className="mt-1"
          >
            <option value="">選択してください</option>
            {orgUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}（{user.role}）
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="委譲先ユーザー" htmlFor="toUserId">
          <Select
            id="toUserId"
            name="toUserId"
            required
            className="mt-1"
          >
            <option value="">選択してください</option>
            {orgUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}（{user.role}）
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="開始日" htmlFor="startDate">
          <Input
            type="date"
            id="startDate"
            name="startDate"
            required
            className="mt-1"
          />
        </FormField>
        <FormField label="終了日" htmlFor="endDate">
          <Input
            type="date"
            id="endDate"
            name="endDate"
            required
            className="mt-1"
          />
        </FormField>
      </div>
      <div>
        <SubmitButton>委譲を追加</SubmitButton>
      </div>
    </form>
  );
}
