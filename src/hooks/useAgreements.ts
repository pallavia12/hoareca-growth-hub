import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Agreement = Tables<"agreements">;
export type AgreementInsert = TablesInsert<"agreements">;

export function useAgreements() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agreements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching agreements:", error.message);
      } else {
        setAgreements(data || []);
      }
    } catch (e) {
      console.error("Exception fetching agreements:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgreements(); }, [fetchAgreements]);

  const addAgreement = async (agreement: AgreementInsert) => {
    const { error } = await supabase.from("agreements").insert(agreement);
    if (error) {
      console.error("Error creating agreement:", error.message);
      return false;
    }
    fetchAgreements();
    return true;
  };

  const updateAgreement = async (id: string, updates: Partial<Agreement>) => {
    const { error } = await supabase
      .from("agreements")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("Error updating agreement:", error.message);
      return false;
    }
    fetchAgreements();
    return true;
  };

  return { agreements, loading, addAgreement, updateAgreement, refetch: fetchAgreements };
}

export function useDistributionPartners() {
  const [partners, setPartners] = useState<Tables<"distribution_partners">[]>([]);
  useEffect(() => {
    supabase.from("distribution_partners").select("*").eq("status", "active").then(({ data }) => {
      setPartners(data || []);
    });
  }, []);
  return partners;
}

export function useDeliverySlots() {
  const [slots, setSlots] = useState<Tables<"delivery_slots">[]>([]);
  useEffect(() => {
    supabase.from("delivery_slots").select("*").eq("is_active", true).then(({ data }) => {
      setSlots(data || []);
    });
  }, []);
  return slots;
}
