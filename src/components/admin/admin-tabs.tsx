"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AdminTab = "internacional" | "nacional";

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const AdminTabs = ({ activeTab, onTabChange }: AdminTabsProps) => {
  return (
    <Tabs
      className="mb-4"
      onValueChange={(value) => onTabChange(value as AdminTab)}
      value={activeTab}
    >
      <TabsList className="h-auto bg-transparent p-0">
        <TabsTrigger
          className="rounded-lg px-4 py-2 font-semibold text-slate-200 data-active:bg-blue-500 data-active:text-white"
          value="internacional"
        >
          Internacionais
        </TabsTrigger>
        <TabsTrigger
          className="rounded-lg px-4 py-2 font-semibold text-slate-200 data-active:bg-amber-500 data-active:text-black"
          value="nacional"
        >
          Nacionais
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default AdminTabs;
export type { AdminTab };
