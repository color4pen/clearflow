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

export function registerClientsTools(server: McpServer): void {
  server.registerTool(
    "clients",
    {
      description:
        "顧客（Client）・顧客担当者（ClientContact）・案件担当者（DealContact）の操作を行います。operation 引数で操作を切り替えます。",
      inputSchema: clientsInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        switch (args.operation) {
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
            const client = await getClient(args.clientId, organizationId);
            if (!client) {
              return toToolError("顧客が見つかりません");
            }
            const contacts = await listClientContacts(args.clientId, organizationId);
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
              name: args.name,
              organizationId,
              actorId: userId,
              industry: args.industry ?? null,
              size: args.size ?? null,
              address: args.address ?? null,
              notes: args.notes ?? null,
              contacts: args.contacts,
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
              clientId: args.clientId,
              organizationId,
              data: {
                name: args.name,
                industry: args.industry,
                size: args.size,
                address: args.address,
                notes: args.notes,
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
              clientId: args.clientId,
              name: args.name,
              organizationId,
              actorId: userId,
              department: args.department ?? null,
              position: args.position ?? null,
              email: args.email ?? null,
              phone: args.phone ?? null,
              isPrimary: args.isPrimary ?? false,
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

            // isPrimary の一意性検証（Server Action と同様）
            const isPrimary = args.isPrimary ?? false;
            const primaryValidation = await validatePrimaryUniqueness(
              args.clientId,
              organizationId,
              args.contactId,
              isPrimary
            );
            if (!primaryValidation.ok) {
              return toToolError(primaryValidation.reason);
            }

            const result = await updateClientContact({
              clientId: args.clientId,
              contactId: args.contactId,
              organizationId,
              data: {
                name: args.name,
                department: args.department,
                position: args.position,
                email: args.email,
                phone: args.phone,
                isPrimary,
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
              contactId: args.contactId,
              clientId: args.clientId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, contactId: args.contactId });
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
              dealId: args.dealId,
              contactId: args.contactId,
              role: args.role as DealContactRole,
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
              dealId: args.dealId,
              contactId: args.contactId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, dealId: args.dealId, contactId: args.contactId });
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
