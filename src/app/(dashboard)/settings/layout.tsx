import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { SettingsNav } from "./SettingsNav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  return (
    <div className="space-y-6">
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
