import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { getOrganizationAction } from "@/app/actions/organization";
import { PageToolbar, SectionCard } from "@/app/components";
import { OrganizationForm } from "./OrganizationForm";

export default async function OrganizationSettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const result = await getOrganizationAction();
  const organization = result.success ? result.organization : null;

  return (
    <div>
      <PageToolbar title="組織設定" />

      <div className="max-w-2xl">
        <SectionCard className="p-5">
          <OrganizationForm currentName={organization?.name ?? ""} />
        </SectionCard>
      </div>
    </div>
  );
}
