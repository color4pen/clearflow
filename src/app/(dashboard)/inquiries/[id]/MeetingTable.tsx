"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/app/components";
import { meetingTypeLabels } from "@/app/(dashboard)/labels";

type MeetingRow = {
  id: string;
  type: string;
  date: string;
  location: string | null;
  summary: string | null;
};

export function MeetingTable({ meetings, basePath }: { meetings: MeetingRow[]; basePath: string }) {
  const router = useRouter();

  return (
    <DataTable<MeetingRow>
      columns={[
        {
          key: "type",
          header: "種別",
          render: (row) => meetingTypeLabels[row.type as keyof typeof meetingTypeLabels] ?? row.type,
        },
        {
          key: "date",
          header: "日時",
          render: (row) => row.date,
        },
        {
          key: "location",
          header: "場所",
          render: (row) => row.location ?? "-",
        },
        {
          key: "summary",
          header: "概要",
          render: (row) => {
            const text = row.summary ?? "-";
            return text.length > 40 ? `${text.slice(0, 40)}...` : text;
          },
        },
      ]}
      rows={meetings}
      rowKey={(row) => row.id}
      onRowClick={(row) => router.push(`${basePath}/${row.id}`)}
    />
  );
}
