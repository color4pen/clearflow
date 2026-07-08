import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import {
  createClient,
  listClients,
  getClient,
  updateClient,
  createClientContact,
  updateClientContact,
  deleteClientContact,
  listClientContacts,
  addDealContact,
  removeDealContact,
} from "@/application/usecases";
import { validatePrimaryUniqueness } from "@/application/services/clientContactService";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { DealContactRole } from "@/domain/models/deal";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const listSchema = z.object({
  operation: z.literal("list"),
});

const getSchema = z.object({
  operation: z.literal("get"),
  clientId: z.string().uuid(),
});

const createSchema = z.object({
  operation: z.literal("create"),
  name: z.string().min(1, "顧客名は必須です"),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, "担当者名は必須です"),
        department: z.string().optional(),
        position: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  clientId: z.string().uuid(),
  name: z.string().min(1).optional(),
  industry: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const addContactSchema = z.object({
  operation: z.literal("add_contact"),
  clientId: z.string().uuid(),
  name: z.string().min(1, "担当者名は必須です"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const updateContactSchema = z.object({
  operation: z.literal("update_contact"),
  clientId: z.string().uuid(),
  contactId: z.string().uuid(),
  name: z.string().min(1).optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

const deleteContactSchema = z.object({
  operation: z.literal("delete_contact"),
  clientId: z.string().uuid(),
  contactId: z.string().uuid(),
});

const addDealContactSchema = z.object({
  operation: z.literal("add_deal_contact"),
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  role: z.enum(["key_person", "decision_maker", "technical", "other"]),
});

const removeDealContactSchema = z.object({
  operation: z.literal("remove_deal_contact"),
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
});

const clientsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  addContactSchema,
  updateContactSchema,
  deleteContactSchema,
  addDealContactSchema,
  removeDealContactSchema,
]);

const clientsAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  addContactSchema,
  updateContactSchema,
  deleteContactSchema,
  addDealContactSchema,
  removeDealContactSchema,
]);

export function registerClientsTools(server: McpServer): void {
  server.registerTool(
    "clients",
    {
      description:
        "顧客（Client）・顧客担当者（ClientContact）・案件担当者（DealContact）の操作を行います。operation 引数で操作を切り替えます。",
      inputSchema: clientsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(clientsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof clientsInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "client", "list")) {
              return toToolError("権限がありません");
            }
            const clients = await listClients(organizationId);
            return toToolSuccess(clients);
          }

          case "get": {
            if (!canPerform(role, "client", "view")) {
              return toToolError("権限がありません");
            }
            const client = await getClient(typedArgs.clientId, organizationId);
            if (!client) {
              return toToolError("顧客が見つかりません");
            }
            const contacts = await listClientContacts(typedArgs.clientId, organizationId);
            return toToolSuccess({ client, contacts });
          }

          case "create": {
            if (!canPerform(role, "client", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createClient:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createClient({
              name: typedArgs.name,
              organizationId,
              actorId: userId,
              industry: typedArgs.industry ?? null,
              size: typedArgs.size ?? null,
              address: typedArgs.address ?? null,
              notes: typedArgs.notes ?? null,
              contacts: typedArgs.contacts,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.client);
          }

          case "update": {
            if (!canPerform(role, "client", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateClient:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateClient({
              clientId: typedArgs.clientId,
              organizationId,
              data: {
                name: typedArgs.name,
                industry: typedArgs.industry,
                size: typedArgs.size,
                address: typedArgs.address,
                notes: typedArgs.notes,
              },
              userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.client);
          }

          case "add_contact": {
            if (!canPerform(role, "client", "addContact")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:addClientContact:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createClientContact({
              clientId: typedArgs.clientId,
              name: typedArgs.name,
              organizationId,
              actorId: userId,
              department: typedArgs.department ?? null,
              position: typedArgs.position ?? null,
              email: typedArgs.email ?? null,
              phone: typedArgs.phone ?? null,
              isPrimary: typedArgs.isPrimary ?? false,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.contact);
          }

          case "update_contact": {
            if (!canPerform(role, "client", "editContact")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateClientContact:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // isPrimary を明示的に true に設定するときのみ一意性を検証する。
            // 省略時（undefined）は変更なしとして扱い、既存の主担当フラグを保持する
            // （フォーム経由の Server Action と異なり、フィールド省略は「未指定」であって
            //  「オフ」ではないため、typedArgs.isPrimary ?? false による降格を避ける）。
            if (typedArgs.isPrimary === true) {
              const primaryValidation = await validatePrimaryUniqueness(
                typedArgs.clientId,
                organizationId,
                typedArgs.contactId,
                true
              );
              if (!primaryValidation.ok) {
                return toToolError(primaryValidation.reason);
              }
            }

            const result = await updateClientContact({
              clientId: typedArgs.clientId,
              contactId: typedArgs.contactId,
              organizationId,
              data: {
                name: typedArgs.name,
                department: typedArgs.department,
                position: typedArgs.position,
                email: typedArgs.email,
                phone: typedArgs.phone,
                isPrimary: typedArgs.isPrimary,
              },
              userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.contact);
          }

          case "delete_contact": {
            if (!canPerform(role, "client", "deleteContact")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteClientContact:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteClientContact({
              contactId: typedArgs.contactId,
              clientId: typedArgs.clientId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, contactId: typedArgs.contactId });
          }

          case "add_deal_contact": {
            if (!canPerform(role, "deal", "manageContacts")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:addDealContact:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await addDealContact({
              dealId: typedArgs.dealId,
              contactId: typedArgs.contactId,
              role: typedArgs.role as DealContactRole,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.dealContact);
          }

          case "remove_deal_contact": {
            if (!canPerform(role, "deal", "manageContacts")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:removeDealContact:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await removeDealContact({
              dealId: typedArgs.dealId,
              contactId: typedArgs.contactId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, dealId: typedArgs.dealId, contactId: typedArgs.contactId });
          }

          default: {
            return toToolError("不明な operation です");
          }
        }
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
