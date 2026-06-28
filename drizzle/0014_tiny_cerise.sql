CREATE INDEX "approval_steps_request_id_idx" ON "approval_steps" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_org_created_at_idx" ON "clients" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "contracts_org_deal_id_idx" ON "contracts" USING btree ("organization_id","deal_id");--> statement-breakpoint
CREATE INDEX "contracts_org_client_id_idx" ON "contracts" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX "deals_org_created_at_idx" ON "deals" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "inquiries_org_created_at_idx" ON "inquiries" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "invoices_org_contract_id_idx" ON "invoices" USING btree ("organization_id","contract_id");--> statement-breakpoint
CREATE INDEX "meetings_org_deal_id_idx" ON "meetings" USING btree ("organization_id","deal_id");--> statement-breakpoint
CREATE INDEX "meetings_org_inquiry_id_idx" ON "meetings" USING btree ("organization_id","inquiry_id");--> statement-breakpoint
CREATE INDEX "requests_org_trigger_entity_id_idx" ON "requests" USING btree ("organization_id","origin_trigger_entity_id");--> statement-breakpoint
CREATE INDEX "revenue_targets_org_period_start_idx" ON "revenue_targets" USING btree ("organization_id","period_start");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_id_idx" ON "webhook_deliveries" USING btree ("endpoint_id");