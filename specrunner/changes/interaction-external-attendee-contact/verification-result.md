# Verification Result — interaction-external-attendee-contact — iter 1

## Verdict: failed

## Phase Results

| # | Phase | Status | Duration | Exit Code |
|---|-------|--------|----------|-----------|
| 1 | build | passed | 16.9s | 0 |
| 2 | typecheck | passed | 1.2s | 0 |
| 3 | test | failed | 1.1s | 1 |
| 4 | lint | skipped | — | — |

## Phase: build

```
▲ Next.js 16.2.9 (Turbopack)

  Creating an optimized production build ...
✓ Compiled successfully in 8.1s
  Running TypeScript ...
  Finished TypeScript in 7.3s ...
  Collecting page data using 7 workers ...
  Generating static pages using 7 workers (0/41) ...
  Generating static pages using 7 workers (10/41) 
  Generating static pages using 7 workers (20/41) 
  Generating static pages using 7 workers (30/41) 
✓ Generating static pages using 7 workers (41/41) in 155ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /.well-known/oauth-authorization-server
├ ƒ /.well-known/oauth-protected-resource
├ ƒ /account
├ ƒ /api/audit-logs/export
├ ƒ /api/auth/[...nextauth]
├ ƒ /api/cron/expire-requests
├ ƒ /api/mcp
├ ƒ /api/oauth/authorize
├ ƒ /api/oauth/register
├ ƒ /api/oauth/token
├ ƒ /api/revenue/export
├ ƒ /clients
├ ƒ /clients/[id]
├ ƒ /clients/new
├ ƒ /contracts
├ ƒ /contracts/[id]
├ ƒ /contracts/[id]/invoices/[invoiceId]
├ ƒ /contracts/[id]/invoices/new
├ ƒ /contracts/new
├ ƒ /dashboard
├ ƒ /deals
├ ƒ /deals/[id]
├ ƒ /deals/[id]/meetings/[meetingId]
├ ƒ /deals/[id]/meetings/new
├ ƒ /deals/new
├ ƒ /inquiries
├ ƒ /inquiries/[id]
├ ƒ /inquiries/new
├ ○ /login
├ ƒ /oauth/consent
├ ƒ /platform
├ ƒ /requests
├ ƒ /requests/[id]
├ ƒ /requests/new
├ ƒ /revenue
├ ƒ /revenue/details
├ ƒ /revenue/forecast
├ ƒ /settings/audit-logs
├ ƒ /settings/delegations
├ ƒ /settings/organization
├ ƒ /settings/policies
├ ƒ /settings/policies/[id]/edit
├ ƒ /settings/policies/new
├ ƒ /settings/templates
├ ƒ /settings/templates/[id]/edit
├ ƒ /settings/templates/new
├ ƒ /settings/users
├ ƒ /settings/webhooks
├ ƒ /settings/webhooks/[id]/deliveries
└ ƒ /tasks


ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


$ next build

```

## Phase: typecheck

```
$ tsc --noEmit

```

## Phase: test

Step 'test' failed

```
bun test v1.3.12 (700fc117)

$ bun test

src/__tests__/domain/domainEvents.test.ts:
[EventDispatcher] Async handler for "inquiry.converted" threw an error: 158 |     await new Promise((r) => setTimeout(r, 20));
159 |     expect(called).toEqual(["async"]);
160 |   });
161 | 
162 |   it("async handler exception does NOT propagate to flushAsync() caller", async () => {
163 |     d.on("inquiry.converted", async () => { throw new Error("async-error"); }, "async");
                                                            ^
error: async-error
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:163:55)
      at flushAsync (src/domain/events/dispatcher.ts:65:38)
      at <anonymous> (src/__tests__/domain/domainEvents.test.ts:169:11)
      at async <anonymous> (src/__tests__/domain/domainEvents.test.ts:166:13)


src/__tests__/usecases/provisionOrganization.dynamic.test.ts:
[provisionOrganization] unexpected error: 57 | // userRepository の個別ファイルモック
58 | mock.module("@/infrastructure/repositories/userRepository", () => ({
59 |   existsByEmail: async (_email: string) => state.emailExists,
60 |   create: async (data: Record<string, unknown>, _tx?: unknown) => {
61 |     state.userCreateArgs = data;
62 |     if (state.failAtUserCreate) throw new Error("userRepository.create failed (simulated)");
                                               ^
error: userRepository.create failed (simulated)
      at create (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:62:43)
      at <anonymous> (src/application/usecases/provisionOrganization.ts:37:47)
      at async <anonymous> (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:40:13)
      at async provisionOrganization (src/application/usecases/provisionOrganization.ts:31:14)
      at async <anonymous> (src/__tests__/usecases/provisionOrganization.dynamic.test.ts:228:26)


src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:
155 |       internalAttendees: [INTERNAL_C],
156 |       // externalAttendees は省略（既存の外部参加者を保持）
157 |     });
158 | 
159 |     expect(result.ok).toBe(true);
160 |     expect(state.updateArgs).not.toBeNull();
                                       ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:160:34)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > internalAttendees のみ指定 → 既存の外部参加者を保持して attendees を構築する [0.25ms]
180 |       externalAttendees: [EXTERNAL_C],
181 |       // internalAttendees は省略（既存の内部参加者を保持）
182 |     });
183 | 
184 |     expect(result.ok).toBe(true);
185 |     const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
                                         ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:185:36)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > externalAttendees のみ指定 → 既存の内部参加者を保持して attendees を構築する [0.10ms]
204 |       internalAttendees: [INTERNAL_B, INTERNAL_C],
205 |       externalAttendees: [EXTERNAL_C],
206 |     });
207 | 
208 |     expect(result.ok).toBe(true);
209 |     const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
                                         ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:209:36)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > 両方指定 → 全差し替え（既存の参加者は使われない） [0.05ms]
232 |       // internalAttendees も externalAttendees も attendees も省略
233 |     });
234 | 
235 |     expect(result.ok).toBe(true);
236 |     // attendees が update に渡されないことを確認
237 |     expect(state.updateArgs!.data.attendees).toBeUndefined();
                       ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:237:18)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > 両方省略 → attendees は変更されない（update に attendees が渡らない） [0.02ms]
246 |       actorId: ACTOR_ID,
247 |       internalAttendees: [], // 内部参加者をクリア
248 |     });
249 | 
250 |     expect(result.ok).toBe(true);
251 |     const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
                                         ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:251:36)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > internalAttendees: []（空配列）→ 内部側クリア、外部側は保持 [0.02ms]
269 |       actorId: ACTOR_ID,
270 |       attendees: newAttendees, // 後方互換の全置換
271 |     });
272 | 
273 |     expect(result.ok).toBe(true);
274 |     const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
                                         ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:274:36)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > 後方互換: attendees が直接指定された場合（Server Action）は全置換される [0.04ms]
286 |       internalAttendees: [INTERNAL_C], // 優先される
287 |       attendees: [INTERNAL_A, EXTERNAL_B], // 無視される
288 |     });
289 | 
290 |     expect(result.ok).toBe(true);
291 |     const updatedAttendees = state.updateArgs!.data.attendees as MeetingAttendee[];
                                         ^
TypeError: null is not an object (evaluating 'state.updateArgs.data')
      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:291:36)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > internalAttendees / externalAttendees と attendees が同時指定 → 前者を優先する [0.03ms]
306 |       organizationId: ORG,
307 |       actorId: ACTOR_ID,
308 |       internalAttendees: [INTERNAL_C],
309 |     });
310 | 
311 |     expect(result.ok).toBe(false);
                            ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (src/__tests__/usecases/updateMeetingPartialAttendees.dynamic.test.ts:311:23)
(fail) updateMeeting — internalAttendees / externalAttendees 部分更新マージロジック > 存在しない商談は ok:false を返す [0.02ms]

src/__tests__/usecases/approvalPolicyFlow.test.ts:
[evaluatePolicies] Policy policy-1 has conditionField set but null conditionOperator or conditionValue — skipping
[handleApprovalCompleted] originTriggerEntityId is null for requestId: req-1

src/__tests__/usecases/interactionManagement.dynamic.test.ts:
185 |       date: new Date("2026-01-15T10:00:00Z"),
186 |       attendees: [],
187 |       actionItems: [],
188 |     });
189 | 
190 |     expect(result.ok).toBe(true);
                            ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:190:23)
(fail) createMeeting — kind=meeting の Interaction 作成 > deal が存在する場合に Interaction が作成され ok: true が返る [0.21ms]
206 |       date: new Date("2026-01-15T10:00:00Z"),
207 |       attendees: [],
208 |       actionItems: [],
209 |     });
210 | 
211 |     expect(state.createArgs).not.toBeNull();
                                       ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:211:34)
(fail) createMeeting — kind=meeting の Interaction 作成 > interactionRepository.create に kind: 'meeting' が渡される [0.12ms]
224 |       date: new Date("2026-01-15T10:00:00Z"),
225 |       attendees: [],
226 |       actionItems: [],
227 |     });
228 | 
229 |     expect(state.auditArgs).not.toBeNull();
                                      ^
error: expect(received).not.toBeNull()

Received: null

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:229:33)
(fail) createMeeting — kind=meeting の Interaction 作成 > 監査ログが interaction.create / targetType: interaction / metadata.kind: meeting で記録される [0.01ms]
242 |       actionItems: [],
243 |     });
244 | 
245 |     expect(result.ok).toBe(false);
246 |     if (!result.ok) {
247 |       expect(result.reason).toContain("案件または引合");
                                  ^
error: expect(received).toContain(expected)

Expected to contain: "案件または引合"
Received: "mock not configured"

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:247:29)
(fail) createMeeting — kind=meeting の Interaction 作成 > dealId も inquiryId も指定しない場合に ok: false が返る [0.15ms]
276 |       date: new Date("2026-01-15T10:00:00Z"),
277 |       attendees: [],
278 |       actionItems: [],
279 |     });
280 | 
281 |     expect(result.ok).toBe(true);
                            ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:281:23)
(fail) createMeeting — kind=meeting の Interaction 作成 > inquiryId を指定した場合に inquiry の存在確認が行われる
295 |       attendees: [],
296 |       actionItems: [],
297 |       details: { challenge: "課題", budget: null, decisionMaker: null, timeline: null, competitors: null, notes: null },
298 |     });
299 | 
300 |     expect(state.createArgs?.details).toBeNull();
                                            ^
error: expect(received).toBeNull()

Received: undefined

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:300:39)
(fail) createMeeting — kind=meeting の Interaction 作成 > meetingType が hearing 以外の場合、details が null で create に渡される [0.07ms]
318 |       summary: "更新後の要約",
319 |     });
320 | 
321 |     expect(result.ok).toBe(true);
322 |     if (result.ok) {
323 |       expect(result.meeting.summary).toBe("更新後の要約");
                                           ^
error: expect(received).toBe(expected)

Expected: "更新後の要約"
Received: null

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:323:38)
(fail) updateMeeting — kind=meeting の Interaction 更新 > Interaction が存在する場合に更新されて ok: true が返る [0.06ms]
333 |       organizationId: ORG_ID,
334 |       actorId: ACTOR_ID,
335 |       summary: "更新内容",
336 |     });
337 | 
338 |     expect(state.auditArgs?.action).toBe("interaction.update");
                                          ^
error: expect(received).toBe(expected)

Expected: "interaction.update"
Received: undefined

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:338:37)
(fail) updateMeeting — kind=meeting の Interaction 更新 > 監査ログが interaction.update / targetType: interaction / metadata.kind: meeting で記録される [0.07ms]
347 |       meetingId: INTERACTION_ID,
348 |       organizationId: ORG_ID,
349 |       actorId: ACTOR_ID,
350 |     });
351 | 
352 |     expect(result.ok).toBe(false);
                            ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:352:23)
(fail) updateMeeting — kind=meeting の Interaction 更新 > Interaction が存在しない場合に ok: false が返る [0.06ms]
360 |       meetingId: INTERACTION_ID,
361 |       organizationId: ORG_ID,
362 |       actorId: ACTOR_ID,
363 |     });
364 | 
365 |     expect(result.ok).toBe(false);
                            ^
error: expect(received).toBe(expected)

Expected: false
Received: true

      at <anonymous> (src/__tests__/usecases/interactionManagement.dynamic.test.ts:365:23)
(fail) updateMeeting — kind=meeting の Interaction 更新 > 楽観ロック失敗（update が null を返す）の場合に ok: false が返る [0.05ms]

 2231 pass
 18 fail
 5249 expect() calls
Ran 2249 tests across 156 files. [1027.00ms]
error: script "test" exited with code 1

```

## Phase: lint

_(skipped — previous command failed)_
