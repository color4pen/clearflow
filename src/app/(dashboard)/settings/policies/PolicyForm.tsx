"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPolicyAction, updatePolicyAction } from "@/app/actions/policies";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";
import {
  FormField,
  Input,
  LinkButton,
  Select,
  Textarea,
  SubmitButton,
  preventEnterSubmit,
} from "@/app/components";
import {
  TRIGGER_ACTION_OPTIONS,
  CONDITION_OPERATOR_OPTIONS,
} from "./constants";

type ActionState =
  | null
  | { success: false; message: string }
  | { success: true; policy: ApprovalPolicy | null | undefined };

type DefaultValues = {
  name: string;
  description: string | null;
  triggerAction: string;
  conditionField: string | null;
  conditionOperator: string | null;
  conditionValue: string | null;
  templateId: string;
};

type Props =
  | { mode: "create"; templates: { id: string; name: string }[] }
  | {
      mode: "edit";
      policyId: string;
      defaultValues: DefaultValues;
      templates: { id: string; name: string }[];
    };

export function PolicyForm(props: Props) {
  const router = useRouter();

  const defaultConditionField =
    props.mode === "edit" ? (props.defaultValues.conditionField ?? "") : "";

  const [conditionField, setConditionField] = useState(defaultConditionField);

  const boundAction =
    props.mode === "edit" ? updatePolicyAction : createPolicyAction;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    boundAction,
    null
  );

  useEffect(() => {
    if (state?.success === true) {
      router.push("/settings/policies");
    }
  }, [state, router]);

  const hasCondition = conditionField.trim() !== "";

  const defaultValues: DefaultValues =
    props.mode === "edit"
      ? props.defaultValues
      : {
          name: "",
          description: null,
          triggerAction: "",
          conditionField: null,
          conditionOperator: null,
          conditionValue: null,
          templateId: "",
        };

  return (
    <div>
      {state?.success === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form
        action={formAction}
        onKeyDown={preventEnterSubmit}
        className="space-y-4"
      >
        {props.mode === "edit" && (
          <input type="hidden" name="id" value={props.policyId} />
        )}

        {/* ポリシー名 */}
        <FormField
          label={
            <>
              ポリシー名 <span className="text-red-500">*</span>
            </>
          }
          htmlFor="name"
        >
          <Input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={defaultValues.name}
            placeholder="例: 高額案件承認ポリシー"
            className="mt-1 block"
          />
        </FormField>

        {/* 説明 */}
        <FormField label="説明" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={defaultValues.description ?? ""}
            placeholder="このポリシーの説明を入力してください"
            className="mt-1 block"
          />
        </FormField>

        {/* トリガーアクション */}
        <FormField
          label={
            <>
              トリガーアクション <span className="text-red-500">*</span>
            </>
          }
          htmlFor="triggerAction"
        >
          <Select
            id="triggerAction"
            name="triggerAction"
            required
            defaultValue={defaultValues.triggerAction}
            className="mt-1"
          >
            <option value="">選択してください</option>
            {TRIGGER_ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        {/* テンプレート */}
        <FormField
          label={
            <>
              テンプレート <span className="text-red-500">*</span>
            </>
          }
          htmlFor="templateId"
        >
          <Select
            id="templateId"
            name="templateId"
            required
            defaultValue={defaultValues.templateId}
            className="mt-1"
          >
            <option value="">選択してください</option>
            {props.templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* 条件フィールド */}
        <FormField label="条件フィールド" htmlFor="conditionField">
          <Input
            id="conditionField"
            name="conditionField"
            type="text"
            value={conditionField}
            onChange={(e) => setConditionField(e.target.value)}
            placeholder="例: amount"
            className="mt-1 block"
          />
        </FormField>

        {/* 条件演算子 */}
        <FormField
          label={
            <>
              条件演算子{hasCondition && <span className="text-red-500"> *</span>}
            </>
          }
          htmlFor="conditionOperator"
        >
          <Select
            id="conditionOperator"
            name="conditionOperator"
            disabled={!hasCondition}
            required={hasCondition}
            defaultValue={defaultValues.conditionOperator ?? ""}
            className="mt-1"
          >
            <option value="">選択してください</option>
            {CONDITION_OPERATOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        {/* 条件値 */}
        <FormField
          label={
            <>
              条件値{hasCondition && <span className="text-red-500"> *</span>}
            </>
          }
          htmlFor="conditionValue"
        >
          <Input
            id="conditionValue"
            name="conditionValue"
            type="text"
            disabled={!hasCondition}
            required={hasCondition}
            defaultValue={defaultValues.conditionValue ?? ""}
            placeholder="例: 100000"
            className="mt-1 block"
          />
        </FormField>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending} pendingText="保存中...">
            {props.mode === "edit" ? "更新する" : "作成する"}
          </SubmitButton>
          <LinkButton
            variant="muted"
            onClick={() => router.push("/settings/policies")}
          >
            キャンセル
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
