import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toToolError } from "./errors";

/**
 * Zod v4 フィールドが null を許容するか再帰的にチェックする。
 * ZodNullable、または ZodOptional の内側が ZodNullable の場合に true を返す。
 */
function isNullable(type: z.ZodTypeAny): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (type as any)._zod?.def as
    | { type?: string; innerType?: z.ZodTypeAny }
    | undefined;
  if (!def) return false;
  if (def.type === "nullable") return true;
  if (def.type === "optional" && def.innerType) return isNullable(def.innerType);
  return false;
}

/**
 * per-operation スキーマ配列から広告用 z.object() を自動生成する。
 *
 * SDK の normalizeObjectSchema() が解釈できる z.object() 形式で全フィールドを公開する。
 * operation フィールドは有効な全 operation 値を列挙した z.enum() として広告する。
 * その他フィールドは全て optional に統一し、operation 別の必須制約はハンドラ内の
 * validateAndParse() で担保する。いずれかの operation スキーマで nullable なフィールドは
 * 広告スキーマでも nullable とし、null 値が SDK レベルで拒否されないようにする。
 */
export function buildAdvertisementSchema(
  operationSchemas: z.ZodObject<z.ZodRawShape>[]
): z.ZodObject<z.ZodRawShape> {
  // 各 operation スキーマから operation の literal 値を収集する
  const operations = operationSchemas.map((schema) => {
    const opField = schema.shape.operation as z.ZodLiteral<string>;
    return opField.value;
  }) as unknown as readonly [string, ...string[]];

  // 全スキーマを走査していずれかの operation で nullable なフィールドを特定する
  const nullableFieldNames = new Set<string>();
  for (const schema of operationSchemas) {
    for (const [key, value] of Object.entries(schema.shape)) {
      if (key === "operation") continue;
      if (isNullable(value as z.ZodTypeAny)) {
        nullableFieldNames.add(key);
      }
    }
  }

  // operation 以外の全フィールドをマージする（同名は先勝ち）
  // nullable なフィールドは .nullable().optional()、それ以外は .optional() を付与する
  const mergedFields: Record<string, z.ZodTypeAny> = {};
  for (const schema of operationSchemas) {
    for (const [key, value] of Object.entries(schema.shape)) {
      if (key === "operation") continue;
      if (!(key in mergedFields)) {
        const fieldType = value as z.ZodTypeAny;
        mergedFields[key] = nullableFieldNames.has(key)
          ? fieldType.nullable().optional()
          : fieldType.optional();
      }
    }
  }

  return z.object({
    operation: z.enum(operations).describe("実行する操作"),
    ...mergedFields,
  });
}

/**
 * discriminatedUnion で引数を厳格に検証する。
 *
 * - 成功時: null を返す（呼び出し元は処理を継続する）
 * - 失敗時: isError: true のツールエラー結果を返す（呼び出し元は早期 return する）
 *
 * 広告用 z.object() は全フィールド optional のため SDK の検証を通過するが、
 * operation 別の必須制約はこの関数で担保する。
 */
export function validateAndParse(
  schema: z.ZodTypeAny,
  args: unknown
): CallToolResult | null {
  const result = schema.safeParse(args);
  if (result.success) {
    return null;
  }
  const issues = result.error.issues as Array<{
    path: (string | number)[];
    message: string;
  }>;
  const messages = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") + ": " : "";
    return `${path}${issue.message}`;
  });
  return toToolError(messages.join(", "));
}
