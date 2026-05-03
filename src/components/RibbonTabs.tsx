export type TabId = "file" | "home" | "insert" | "pageLayout" | "formulas";

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
];

export const RibbonTabs = ({ activeTab, onTabChange }: RibbonTabsProps) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 40,
        background: "#f3f2f1",
        padding: "4px 12px 0 12px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              height: "100%",
              padding: "0 16px",
              background: isActive ? "#faf9f8" : "transparent",
              border: "none",
              borderTop: isActive ? "3px solid #217346" : "3px solid transparent",
              borderLeft: isActive ? "1px solid #e1dfdd" : "1px solid transparent",
              borderRight: isActive ? "1px solid #e1dfdd" : "1px solid transparent",
              borderTopLeftRadius: isActive ? 4 : 0,
              borderTopRightRadius: isActive ? 4 : 0,
              color: isActive ? "#217346" : "#323130",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
              marginRight: 4,
              position: "relative",
              top: isActive ? 1 : 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
