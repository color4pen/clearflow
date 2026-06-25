"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { phaseLabels, contractTypeLabels } from "@/app/(dashboard)/labels";

const allPhases = [
  "proposal_prep",
  "proposed",
  "negotiation",
  "won",
  "lost",
] as const;

type Props = {
  currentPhase: string;
  currentClient: string;
  currentContractType: string;
  clients: string[];
  contractTypes: string[];
};

export function DealsFilter({
  currentPhase,
  currentClient,
  currentContractType,
  clients,
  contractTypes,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/deals?${params.toString()}`);
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={currentPhase}
        onChange={(e) => updateFilter("phase", e.target.value)}
        className="text-xs border border-border bg-bg-surface text-text px-2 py-1 rounded"
      >
        <option value="">すべてのフェーズ</option>
        {allPhases.map((p) => (
          <option key={p} value={p}>
            {phaseLabels[p]}
          </option>
        ))}
      </select>
      <select
        value={currentClient}
        onChange={(e) => updateFilter("client", e.target.value)}
        className="text-xs border border-border bg-bg-surface text-text px-2 py-1 rounded"
      >
        <option value="">すべての顧客</option>
        {clients.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={currentContractType}
        onChange={(e) => updateFilter("contractType", e.target.value)}
        className="text-xs border border-border bg-bg-surface text-text px-2 py-1 rounded"
      >
        <option value="">すべての契約形態</option>
        {contractTypes.map((ct) => (
          <option key={ct} value={ct}>
            {contractTypeLabels[ct] ?? ct}
          </option>
        ))}
      </select>
    </div>
  );
}
