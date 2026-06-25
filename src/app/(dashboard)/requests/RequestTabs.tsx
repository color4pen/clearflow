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
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors",
              isActive
                ? "border-primary text-primary font-bold bg-bg-surface"
                : "border-transparent text-text-secondary hover:text-text hover:border-border",
            ].join(" ")}
          >
            <span>{tab.label}</span>
            <span
              className={[
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold min-w-[18px] text-center",
                isActive
                  ? "bg-primary text-white"
                  : "bg-bg-toolbar text-text-muted",
              ].join(" ")}
            >
              {tab.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
