import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { inquiryRepository } from "@/infrastructure/repositories";
import { MeetingForm } from "./MeetingForm";

export default async function MeetingNewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const organizationId = session!.user.organizationId;

  const inquiry = await inquiryRepository.findById(id, organizationId);
  if (!inquiry) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">商談記録</span>
        <span className="text-text-muted text-xs ml-2">
          <Link href="/inquiries" className="text-primary underline">引き合い一覧</Link>
          {" > "}
          <Link href={`/inquiries/${id}`} className="text-primary underline">{inquiry.title}</Link>
          {" > "}商談記録
        </span>
      </div>
      <MeetingForm inquiryId={id} />
    </div>
  );
}
