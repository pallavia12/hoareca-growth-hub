import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type SampleOrder = Tables<"sample_orders">;
export type SampleOrderInsert = TablesInsert<"sample_orders">;

export interface SampleOrderFilters {
  search: string;
  pincode: string;
  status: string;
  tab: "scheduled" | "completed" | "revisit" | "dropped";
}

export function useSampleOrders() {
  const [orders, setOrders] = useState<SampleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sample_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching sample orders:", error.message);
      } else {
        setOrders(data || []);
      }
    } catch (e) {
      console.error("Exception fetching sample orders:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const addOrder = async (order: SampleOrderInsert) => {
    const { error } = await supabase.from("sample_orders").insert(order);
    if (error) {
      toast({ title: "Error creating sample order", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Sample order created successfully" });
    fetchOrders();
    return true;
  };

  const updateOrder = async (id: string, updates: Partial<SampleOrder>) => {
    const { error } = await supabase
      .from("sample_orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error updating sample order", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Sample order updated" });
    fetchOrders();
    return true;
  };

  return { orders, loading, addOrder, updateOrder, refetch: fetchOrders };
}
