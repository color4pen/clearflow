"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplateAction, updateTemplateAction } from "@/app/actions/templates";
import type { ApprovalTemplate, TemplateField } from "@/domain/models/approvalTemplate";
import { FormField, Input, Select, SubmitButton, LinkButton } from "@/app/components";

type ActionState =
  | null
  | { success: false; message: string }
  | { success: true; template: ApprovalTemplate };

type StepCondition = {
  field: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  value: number;
};

type Step = {
  approverRole: "admin" | "member" | "manager" | "finance";
  deadlineHours?: number;
  condition?: StepCondition;
};

const ROLE_OPTIONS: { value: Step["approverRole"]; label: string }[] = [
  { value: "admin", label: "管理者 (admin)" },
  { value: "manager", label: "マネージャー (manager)" },
  { value: "finance", label: "経理 (finance)" },
  { value: "member", label: "メンバー (member)" },
];

const OPERATOR_OPTIONS: { value: StepCondition["operator"]; label: string }[] = [
  { value: "gt", label: "より大きい (>)" },
  { value: "gte", label: "以上 (>=)" },
  { value: "lt", label: "より小さい (<)" },
  { value: "lte", label: "以下 (<=)" },
  { value: "eq", label: "等しい (=)" },
];

const FIELD_TYPE_OPTIONS: { value: TemplateField["type"]; label: string }[] = [
  { value: "text", label: "テキスト" },
  { value: "number", label: "数値" },
  { value: "date", label: "日付" },
  { value: "textarea", label: "テキストエリア" },
  { value: "select", label: "選択" },
];

type Props =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      templateId: string;
      defaultValues: {
        name: string;
        steps: Step[];
        fields: TemplateField[];
      };
    };

export function TemplateForm(props: Props) {
  const router = useRouter();

  const defaultSteps: Step[] =
    props.mode === "edit"
      ? props.defaultValues.steps
      : [{ approverRole: "manager" }];

  const defaultFields: TemplateField[] =
    props.mode === "edit" ? props.defaultValues.fields : [];

  const [steps, setSteps] = useState<Step[]>(defaultSteps);
  const [fields, setFields] = useState<TemplateField[]>(defaultFields);

  const boundAction =
    props.mode === "edit"
      ? (_prev: ActionState, formData: FormData) => {
          formData.set("id", (props as { mode: "edit"; templateId: string }).templateId);
          return updateTemplateAction(_prev, formData);
        }
      : createTemplateAction;

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    boundAction,
    null
  );

  // Redirect on success
  useEffect(() => {
    if (state?.success === true) {
      router.push("/settings/templates");
    }
  }, [state, router]);

  // Steps management
  function addStep() {
    setSteps((prev) => [...prev, { approverRole: "manager" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number | undefined | StepCondition) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  }

  function toggleStepCondition(index: number, hasCondition: boolean) {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index) return step;
        if (hasCondition) {
          return { ...step, condition: { field: "", operator: "gt" as const, value: 0 } };
        } else {
          const { condition: _condition, ...rest } = step;
          void _condition;
          return rest;
        }
      })
    );
  }

  function updateStepCondition(index: number, key: keyof StepCondition, value: string | number) {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index || !step.condition) return step;
        return {
          ...step,
          condition: {
            ...step.condition,
            [key]: key === "value" ? Number(value) : value,
          },
        };
      })
    );
  }

  // Fields management
  function addField() {
    setFields((prev) => [
      ...prev,
      { name: "", label: "", type: "text", required: false },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateField(index: number, key: keyof TemplateField, value: unknown) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const stepsInput = form.elements.namedItem("steps") as HTMLInputElement;
    if (stepsInput) {
      stepsInput.value = JSON.stringify(steps);
    }
    const fieldsInput = form.elements.namedItem("fields") as HTMLInputElement;
    if (fieldsInput) {
      fieldsInput.value = JSON.stringify(fields);
    }
  }

  return (
    <div>
      {state?.success === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Hidden fields */}
        <input type="hidden" name="steps" defaultValue="" />
        <input type="hidden" name="fields" defaultValue="" />
        {props.mode === "edit" && (
          <input type="hidden" name="id" value={props.templateId} />
        )}

        {/* Template name */}
        <FormField
          label={<>テンプレート名 <span className="text-red-500">*</span></>}
          htmlFor="name"
        >
          <Input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={props.mode === "edit" ? props.defaultValues.name : ""}
            placeholder="例: 経費申請テンプレート"
            className="mt-1 block"
          />
        </FormField>

        {/* Fields editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-text">フォームフィールド</h3>
            <LinkButton variant="primary" onClick={addField} type="button">
              + フィールドを追加
            </LinkButton>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={index}
                className="p-2 border border-border-light bg-bg-surface-alt space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <FormField label="フィールド名 (英数字)">
                      <Input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateField(index, "name", e.target.value)}
                        placeholder="例: amount"
                      />
                    </FormField>
                    <FormField label="ラベル">
                      <Input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, "label", e.target.value)}
                        placeholder="例: 金額"
                      />
                    </FormField>
                    <FormField label="タイプ">
                      <Select
                        value={field.type}
                        onChange={(e) => updateField(index, "type", e.target.value as TemplateField["type"])}
                      >
                        {FIELD_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="必須">
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, "required", e.target.checked)}
                          className="h-3 w-3"
                        />
                        <span className="text-xs text-text">必須</span>
                      </div>
                    </FormField>
                  </div>
                  <div className="pt-4">
                    <LinkButton
                      variant="danger"
                      onClick={() => removeField(index)}
                      type="button"
                    >
                      削除
                    </LinkButton>
                  </div>
                </div>
                {field.type === "select" && (
                  <FormField label="選択肢 (カンマ区切り)">
                    <Input
                      type="text"
                      value={(field.options ?? []).join(",")}
                      onChange={(e) =>
                        updateField(
                          index,
                          "options",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="例: 経費,備品,その他"
                    />
                  </FormField>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Approval steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-text">
              承認ステップ <span className="text-red-500">*</span>
            </h3>
            <LinkButton variant="primary" onClick={addStep} type="button">
              + ステップを追加
            </LinkButton>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 border border-border-light bg-bg-surface-alt"
              >
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FormField
                      label={<>承認者ロール <span className="text-red-500">*</span></>}
                    >
                      <Select
                        value={step.approverRole}
                        onChange={(e) =>
                          updateStep(
                            index,
                            "approverRole",
                            e.target.value as Step["approverRole"]
                          )
                        }
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="期限（時間）">
                      <Input
                        type="number"
                        min={1}
                        value={step.deadlineHours ?? ""}
                        onChange={(e) =>
                          updateStep(
                            index,
                            "deadlineHours",
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                          )
                        }
                        placeholder="例: 48"
                      />
                    </FormField>
                  </div>

                  {/* Condition settings */}
                  <div>
                    <label className="flex items-center gap-2 text-xs text-text">
                      <input
                        type="checkbox"
                        checked={!!step.condition}
                        onChange={(e) => toggleStepCondition(index, e.target.checked)}
                        className="h-3 w-3"
                      />
                      条件付きステップ
                    </label>
                    {step.condition && (
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        <FormField label="対象フィールド">
                          <Input
                            type="text"
                            value={step.condition.field}
                            onChange={(e) => updateStepCondition(index, "field", e.target.value)}
                            placeholder="例: amount"
                          />
                        </FormField>
                        <FormField label="演算子">
                          <Select
                            value={step.condition.operator}
                            onChange={(e) =>
                              updateStepCondition(index, "operator", e.target.value)
                            }
                          >
                            {OPERATOR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label="値">
                          <Input
                            type="number"
                            value={step.condition.value}
                            onChange={(e) =>
                              updateStepCondition(index, "value", e.target.value)
                            }
                            placeholder="例: 100000"
                          />
                        </FormField>
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-4">
                  <LinkButton
                    variant="danger"
                    disabled={steps.length <= 1}
                    onClick={() => removeStep(index)}
                    type="button"
                  >
                    削除
                  </LinkButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <SubmitButton pending={pending} pendingText="保存中...">
            {props.mode === "edit" ? "更新する" : "作成する"}
          </SubmitButton>
          <a
            href="/settings/templates"
            className="text-xs text-text-muted underline"
          >
            キャンセル
          </a>
        </div>
      </form>
    </div>
  );
}
