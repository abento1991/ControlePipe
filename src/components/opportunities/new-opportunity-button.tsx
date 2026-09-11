"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityFormDialog } from "./opportunity-form-dialog";

export function NewOpportunityButton({ variant = "accent", size = "sm", label = "Nova oportunidade" }: { variant?: "accent" | "default" | "outline"; size?: "sm" | "default"; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus /> <span className="hidden sm:inline">{label}</span>
      </Button>
      <OpportunityFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
