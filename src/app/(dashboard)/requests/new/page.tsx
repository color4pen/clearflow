"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createRequestAction,
  listTemplatesForRequestAction,
  type CreateRequestState,
} from "@/app/actions/requests";
import {
  PageToolbar,
  SectionCard,
  FormField,
  Input,
  Textarea,
  Select,
  SubmitButton,
  preventEnterSubmit,
} from "@/app/components";
import type { ApprovalTemplate, TemplateField } from "@/domain/models/approvalTemplate";

const initialState: CreateRequestState = {};

export default function NewRequestPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createRequestAction,
    initialState
  );

  const [templates, setTemplates] = useState<ApprovalTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const selectedTemplate: ApprovalTemplate | null = selectedTemplateId
    ? templates.find((t) => t.id === selectedTemplateId) ?? null
    : null;

  useEffect(() => {
    listTemplatesForRequestAction().then((result) => {
      if (result.success) {
        setTemplates(result.templates);
      }
    });
  }, []);

  useEffect(() => {
    // Redirect on success (no errors, no message, and state has been touched)
    if (
      state !== initialState &&
      !state.errors &&
      !state.message
    ) {
      router.push("/requests");
    }
  }, [state, router]);

  function renderField(field: TemplateField) {
    const fieldName = `field_${field.name}`;
    const fieldError = state.errors?.formData?.[field.name]?.[0];
    const label = (
      <>
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </>
    );

    if (field.type === "textarea") {
      return (
        <FormField key={field.name} label={label} htmlFor={fieldName} error={fieldError}>
          <Textarea
            id={fieldName}
            name={fieldName}
            rows={4}
            required={field.required}
            placeholder={field.label + "を入力"}
          />
        </FormField>
      );
    }

    if (field.type === "select") {
      return (
        <FormField key={field.name} label={label} htmlFor={fieldName} error={fieldError}>
          <Select id={fieldName} name={fieldName} required={field.required}>
            <option value="">選択してください</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </FormField>
      );
    }

    if (field.type === "number") {
      return (
        <FormField key={field.name} label={label} htmlFor={fieldName} error={fieldError}>
          <Input
            id={fieldName}
            name={fieldName}
            type="number"
            step="any"
            required={field.required}
            placeholder={field.label + "を入力"}
          />
        </FormField>
      );
    }

    if (field.type === "date") {
      return (
        <FormField key={field.name} label={label} htmlFor={fieldName} error={fieldError}>
          <Input
            id={fieldName}
            name={fieldName}
            type="date"
            required={field.required}
          />
        </FormField>
      );
    }

    // Default: text
    return (
      <FormField key={field.name} label={label} htmlFor={fieldName} error={fieldError}>
        <Input
          id={fieldName}
          name={fieldName}
          type="text"
          required={field.required}
          placeholder={field.label + "を入力"}
        />
      </FormField>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <PageToolbar title="新規申請" />
      </div>

      <SectionCard className="p-4">
        {state.message && (
          <div className="mb-4 p-3 bg-status-red-bg border border-status-red-text/30 text-status-red-text text-xs">
            {state.message}
          </div>
        )}

        <form action={formAction} onKeyDown={preventEnterSubmit} className="space-y-4">
          <FormField
            label={<>タイトル <span className="text-danger">*</span></>}
            htmlFor="title"
            error={state.errors?.title?.[0]}
          >
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="申請のタイトルを入力"
            />
          </FormField>

          <FormField
            label={<>申請種別 <span className="text-danger">*</span></>}
            htmlFor="templateId"
            error={state.errors?.templateId?.[0]}
          >
            <Select
              id="templateId"
              name="templateId"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              required
            >
              <option value="">テンプレートを選択してください</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </FormField>

          {selectedTemplate && selectedTemplate.fields.map((field) => renderField(field))}

          <div className="flex items-center gap-3 pt-1">
            <SubmitButton pending={isPending} pendingText="作成中...">
              申請を作成
            </SubmitButton>
            <Link
              href="/requests"
              className="text-xs text-text-muted underline"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
