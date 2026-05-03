export type TabId = "file" | "home" | "insert" | "pageLayout" | "formulas" | "data" | "review" | "view";

interface RibbonTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "file", label: "File" },
  { id: "home", label: "Home" },
  { id: "insert", label: "Insert" },
  { id: "pageLayout", label: "Page Layout" },
  { id: "formulas", label: "Formulas" },
  { id: "data", label: "Data" },
  { id: "review", label: "Review" },
  { id: "view", label: "View" },
];

export const RibbonTabsFixed = ({ activeTab, onTabChange }: RibbonTabsProps) => {
  return (
    <div className="flex items-center h-12 px-6 bg-white rounded-full shadow-sm w-full gap-2 border border-white/50">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-3 py-1 text-sm font-medium transition-colors outline-none h-full flex flex-col items-center justify-center group"
          >
            <span className={`${isActive ? "text-gray-900" : "text-gray-600 group-hover:text-gray-900"}`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute bottom-[2px] h-[3px] w-[60%] rounded-full bg-gradient-to-r from-emerald-400 to-purple-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
