import { dealRepository, clientRepository } from "@/infrastructure/repositories";

/** 紐づけ先候補の共通表示形（テーブル各列 + 別タブで開くリンク） */
export type LinkTargetResult = {
  id: string;
  primary: string; // 主表示: 案件/引合タイトル、商談は「日付 種別」
  secondary: string | null; // 副表示: 顧客名（案件/引合）、商談は親の案件/引合名
  href: string | null; // エンティティ画面の URL（別タブで開く。無い場合は null）
};

export async function searchDeals(
  organizationId: string,
  query: string
): Promise<LinkTargetResult[]> {
  const deals = await dealRepository.searchByTitle(organizationId, query);

  // タイトルだけでは顧客の区別が付かないため顧客名を解決する
  const clientIds = [...new Set(deals.map((deal) => deal.clientId))];
  const clients = await Promise.all(
    clientIds.map((id) => clientRepository.findById(id, organizationId))
  );
  const clientNameById = new Map<string, string>();
  for (const client of clients) {
    if (client) clientNameById.set(client.id, client.name);
  }

  return deals.map((deal) => ({
    id: deal.id,
    primary: deal.title,
    secondary: clientNameById.get(deal.clientId) ?? null,
    href: `/deals/${deal.id}`,
  }));
}
