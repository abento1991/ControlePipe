"use client";

import { Menu } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { UserMenu } from "./user-menu";
import { NewOpportunityButton } from "@/components/opportunities/new-opportunity-button";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 h-14 border-b bg-background/85 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
      <button className="lg:hidden text-muted-foreground" onClick={onMenu} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <NewOpportunityButton />
        <UserMenu />
      </div>
    </header>
  );
}
