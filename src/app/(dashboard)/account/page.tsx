import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { PageToolbar, SectionCard } from "@/app/components";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { ApiTokenSection } from "./ApiTokenSection";
import { listApiTokensAction } from "@/app/actions/apiTokens";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const tokenResult = await listApiTokensAction();
  const tokens = tokenResult.success ? tokenResult.tokens : [];

  return (
    <div>
      <PageToolbar title="アカウント設定" />

      <div className="max-w-2xl space-y-4">
        <SectionCard className="p-5">
          <ProfileForm currentName={session.user.name ?? ""} />
        </SectionCard>

        <SectionCard className="p-5">
          <PasswordForm />
        </SectionCard>

        <SectionCard className="p-5">
          <ApiTokenSection initialTokens={tokens} />
        </SectionCard>
      </div>
    </div>
  );
}
