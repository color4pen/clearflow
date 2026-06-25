/**
 * filterInquiries — unit tests
 *
 * TC-004: ステータスタブで全件が表示される
 * TC-005: ステータスタブで新規のみフィルタされる
 * TC-006: 経路ドロップダウンでフィルタされる
 * TC-007: 検索入力で顧客名が部分一致フィルタされる
 * TC-008: 検索入力で件名が部分一致フィルタされる
 * TC-009: 複数フィルタが AND 条件で適用される
 */

import { describe, it, expect } from "bun:test";
import { filterInquiries } from "../../app/(dashboard)/inquiries/filterInquiries";
import type { InquiryRow } from "../../app/(dashboard)/inquiries/filterInquiries";

const ROWS: InquiryRow[] = [
  {
    id: "1",
    title: "Web サービス導入の相談",
    clientName: "株式会社サンプル",
    source: "web",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    dealId: null,
  },
  {
    id: "2",
    title: "電話での問い合わせ",
    clientName: "テスト商事",
    source: "phone",
    status: "new",
    createdAt: "2026-01-02T00:00:00.000Z",
    dealId: null,
  },
  {
    id: "3",
    title: "展示会からの引合",
    clientName: null,
    source: "exhibition",
    status: "converted",
    createdAt: "2026-01-03T00:00:00.000Z",
    dealId: "deal-1",
  },
  {
    id: "4",
    title: "見送り案件",
    clientName: "株式会社テスト",
    source: "referral",
    status: "declined",
    createdAt: "2026-01-04T00:00:00.000Z",
    dealId: null,
  },
];

// ---------------------------------------------------------------------------
// TC-004: ステータスタブで全件が表示される
// ---------------------------------------------------------------------------

describe("TC-004: ステータスタブ = all", () => {
  it("activeTab=all のとき全件が返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "",
    });
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// TC-005: ステータスタブで新規のみフィルタされる
// ---------------------------------------------------------------------------

describe("TC-005: ステータスタブ = new", () => {
  it("activeTab=new のとき status=new の行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "new",
      sourceFilter: "",
      searchQuery: "",
    });
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === "new")).toBe(true);
  });

  it("activeTab=converted のとき status=converted の行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "converted",
      sourceFilter: "",
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("activeTab=declined のとき status=declined の行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "declined",
      sourceFilter: "",
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("4");
  });
});

// ---------------------------------------------------------------------------
// TC-006: 経路ドロップダウンでフィルタされる
// ---------------------------------------------------------------------------

describe("TC-006: 経路フィルタ", () => {
  it("sourceFilter=web のとき source=web の行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "web",
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("sourceFilter=phone のとき source=phone の行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "phone",
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("sourceFilter='' のとき全件が返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "",
    });
    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// TC-007: 検索入力で顧客名が部分一致フィルタされる
// ---------------------------------------------------------------------------

describe("TC-007: 顧客名での部分一致検索", () => {
  it("searchQuery=サンプル のとき clientName に含む行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "サンプル",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("大文字小文字を区別しない（ASCII）", () => {
    const rows: InquiryRow[] = [
      {
        id: "x",
        title: "test",
        clientName: "ABC Corp",
        source: "web",
        status: "new",
        createdAt: "2026-01-01T00:00:00.000Z",
        dealId: null,
      },
    ];
    const result = filterInquiries(rows, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "abc",
    });
    expect(result).toHaveLength(1);
  });

  it("clientName が null の行は顧客名検索にヒットしない", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "展示会",
    });
    // 顧客名に「展示会」は含まれず、件名 "展示会からの引合" はヒット
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });
});

// ---------------------------------------------------------------------------
// TC-008: 検索入力で件名が部分一致フィルタされる
// ---------------------------------------------------------------------------

describe("TC-008: 件名での部分一致検索", () => {
  it("searchQuery=電話 のとき title に含む行のみ返る", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "電話",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("件名・顧客名のどちらかにヒットすれば返る", () => {
    // id=1 は title "Web サービス..." でヒット
    // id=3 は clientName=null, title "展示会..." でヒット
    const result = filterInquiries(ROWS, {
      activeTab: "all",
      sourceFilter: "",
      searchQuery: "web サービス",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// TC-009: 複数フィルタが AND 条件で適用される
// ---------------------------------------------------------------------------

describe("TC-009: 複数フィルタの AND 適用", () => {
  it("activeTab=new かつ sourceFilter=web のとき AND 条件で絞り込まれる", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "new",
      sourceFilter: "web",
      searchQuery: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("activeTab=new かつ searchQuery=テスト のとき AND 条件で絞り込まれる", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "new",
      sourceFilter: "",
      searchQuery: "テスト",
    });
    // id=2: status=new, clientName="テスト商事" → ヒット
    // id=4: status=declined → タブで除外
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("どのフィルタにも一致しない場合は 0 件になる", () => {
    const result = filterInquiries(ROWS, {
      activeTab: "converted",
      sourceFilter: "phone",
      searchQuery: "",
    });
    expect(result).toHaveLength(0);
  });
});
