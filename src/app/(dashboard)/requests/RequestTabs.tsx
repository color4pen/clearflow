import Link from "next/link";

type TabItem = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  currentTab: string;
  tabs: TabItem[];
};

export function RequestTabs({ currentTab, tabs }: Props) {
  return (
    <div className="flex items-end gap-0 border-b border-border mb-0">
      {tabs.map((tab) => {
        const isActive = tab.key === currentTab;
        return (
          <Link
            key={tab.key}
            href={`/requests?tab=${tab.key}`}
            className={[
              "px-4 py-2 text-xs font-medium border-b-2 transition-colors",
              isActive
                ? "border-primary text-primary font-bold bg-bg-surface"
                : "border-transparent text-text-secondary hover:text-text hover:border-border",
            ].join(" ")}
          >
            {tab.label} ({tab.count})
          </Link>
        );
      })}
    </div>
  );
}
