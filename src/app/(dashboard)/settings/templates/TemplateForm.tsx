"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTemplateAction, updateTemplateAction } from "@/app/actions/templates";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";
import { BTN_SUBMIT, BTN_SECONDARY, INPUT_BASE } from "../../styles";

type ActionState =
  | null
  | { success: false; message: string }
  | { success: true; template: ApprovalTemplate };

type Step = {
  approverRole: "admin" | "member" | "manager" | "finance";
  deadlineHours?: number;
};

const ROLE_OPTIONS: { value: Step["approverRole"]; label: string }[] = [
  { value: "admin", label: "管理者 (admin)" },
  { value: "manager", label: "マネージャー (manager)" },
  { value: "finance", label: "経理 (finance)" },
  { value: "member", label: "メンバー (member)" },
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
        minAmount: number | null;
        maxAmount: number | null;
        steps: Step[];
      };
    };

export function TemplateForm(props: Props) {
  const router = useRouter();

  const defaultSteps: Step[] =
    props.mode === "edit"
      ? props.defaultValues.steps
      : [{ approverRole: "manager" }];

  const [steps, setSteps] = useState<Step[]>(defaultSteps);

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

  function addStep() {
    setSteps((prev) => [...prev, { approverRole: "manager" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number | undefined) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const stepsInput = form.elements.namedItem("steps") as HTMLInputElement;
    if (stepsInput) {
      stepsInput.value = JSON.stringify(steps);
    }
  }

  return (
    <div>
      {state?.success === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200">
          <p className="text-xs text-[#c0392b]">{state.message}</p>
        </div>
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Hidden fields */}
        <input type="hidden" name="steps" defaultValue="" />
        {props.mode === "edit" && (
          <input type="hidden" name="id" value={props.templateId} />
        )}

        {/* Template name */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-bold text-[#2c3e50] mb-1"
          >
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={props.mode === "edit" ? props.defaultValues.name : ""}
            placeholder="例: 経費申請テンプレート"
            className={`mt-1 block ${INPUT_BASE}`}
          />
        </div>

        {/* Amount conditions */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="minAmount"
              className="block text-xs font-bold text-[#2c3e50] mb-1"
            >
              最小金額（円）
            </label>
            <input
              id="minAmount"
              name="minAmount"
              type="number"
              min={0}
              defaultValue={
                props.mode === "edit" && props.defaultValues.minAmount != null
                  ? props.defaultValues.minAmount
                  : ""
              }
              placeholder="例: 10000"
              className={`mt-1 block ${INPUT_BASE}`}
            />
          </div>
          <div>
            <label
              htmlFor="maxAmount"
              className="block text-xs font-bold text-[#2c3e50] mb-1"
            >
              最大金額（円）
            </label>
            <input
              id="maxAmount"
              name="maxAmount"
              type="number"
              min={0}
              defaultValue={
                props.mode === "edit" && props.defaultValues.maxAmount != null
                  ? props.defaultValues.maxAmount
                  : ""
              }
              placeholder="例: 100000"
              className={`mt-1 block ${INPUT_BASE}`}
            />
          </div>
        </div>

        {/* Approval steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#2c3e50]">
              承認ステップ <span className="text-red-500">*</span>
            </h3>
            <button
              type="button"
              onClick={addStep}
              className="text-xs text-[#2980b9] underline"
            >
              + ステップを追加
            </button>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 border border-[#e0e0e0] bg-[#f9f9f9]"
              >
                <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#2c3e50] mb-1">
                      承認者ロール <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={step.approverRole}
                      onChange={(e) =>
                        updateStep(
                          index,
                          "approverRole",
                          e.target.value as Step["approverRole"]
                        )
                      }
                      className="block w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#2c3e50] mb-1">
                      期限（時間）
                    </label>
                    <input
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
                      className="block w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 1}
                    className="text-xs text-[#c0392b] underline disabled:text-[#bdc3c7] disabled:no-underline disabled:cursor-not-allowed"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className={BTN_SUBMIT}
          >
            {pending
              ? "保存中..."
              : props.mode === "edit"
              ? "更新する"
              : "作成する"}
          </button>
          <a
            href="/settings/templates"
            className={BTN_SECONDARY}
          >
            キャンセル
          </a>
        </div>
      </form>
    </div>
  );
}
