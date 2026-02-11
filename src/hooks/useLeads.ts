import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Lead = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;

export interface LeadFilters {
  search: string;
  pincode: string;
  status: string;
  tab: "fresh" | "revisit" | "dropped";
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error fetching leads", description: error.message, variant: "destructive" });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const addLead = async (lead: LeadInsert) => {
    const { error } = await supabase.from("leads").insert(lead);
    if (error) {
      toast({ title: "Error adding lead", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Lead added successfully" });
    fetchLeads();
    return true;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase
      .from("leads")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error updating lead", description: error.message, variant: "destructive" });
      return false;
    }
    fetchLeads();
    return true;
  };

  const filterLeads = (filters: LeadFilters): Lead[] => {
    return leads.filter((l) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!l.client_name.toLowerCase().includes(s) && !(l.locality || "").toLowerCase().includes(s) && !l.pincode.includes(s)) return false;
      }
      if (filters.pincode && l.pincode !== filters.pincode) return false;
      if (filters.status && l.status !== filters.status) return false;

      if (filters.tab === "fresh") return (l.call_count || 0) === 0 && (l.visit_count || 0) === 0;
      if (filters.tab === "revisit") return (l.call_count || 0) > 0 || (l.visit_count || 0) > 0;
      if (filters.tab === "dropped") return l.status === "failed";
      return true;
    });
  };

  return { leads, loading, addLead, updateLead, filterLeads, refetch: fetchLeads };
}
