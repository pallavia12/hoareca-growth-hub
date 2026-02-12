import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type Prospect = Tables<"prospects">;
export type ProspectInsert = TablesInsert<"prospects">;

export interface ProspectFilters {
  search: string;
  pincode: string;
  locality: string;
  status: string;
  tab: "fresh" | "revisit" | "dropped";
}

export function useProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching prospects:", error.message);
      } else {
        setProspects(data || []);
      }
    } catch (e) {
      console.error("Exception fetching prospects:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  const addProspect = async (prospect: ProspectInsert) => {
    const { error } = await supabase.from("prospects").insert(prospect);
    if (error) {
      toast({ title: "Error adding prospect", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Prospect added successfully" });
    fetchProspects();
    return true;
  };

  const updateProspect = async (id: string, updates: Partial<Prospect>) => {
    const { error } = await supabase
      .from("prospects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error updating prospect", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Prospect updated" });
    fetchProspects();
    return true;
  };

  const updateProspectStatus = async (ids: string[], status: string) => {
    const { error } = await supabase
      .from("prospects")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: `${ids.length} prospect(s) updated` });
    fetchProspects();
    return true;
  };

  const filterProspects = (filters: ProspectFilters): Prospect[] => {
    return prospects.filter((p) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!p.restaurant_name.toLowerCase().includes(s) && !p.locality.toLowerCase().includes(s) && !p.pincode.includes(s)) return false;
      }
      if (filters.pincode && filters.pincode !== "all" && p.pincode !== filters.pincode) return false;
      if (filters.locality && p.locality !== filters.locality) return false;
      if (filters.status && p.status !== filters.status) return false;

      if (filters.tab === "fresh") return p.status === "available";
      if (filters.tab === "revisit") return p.status === "assigned";
      if (filters.tab === "dropped") return p.status === "dropped";
      return true;
    });
  };

  return { prospects, loading, addProspect, updateProspect, updateProspectStatus, filterProspects, refetch: fetchProspects };
}
