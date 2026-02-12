import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoUsers = [
      { email: "agent@ninjacart.com", password: "demo123456", full_name: "Rahul Sharma", role: "calling_agent" },
      { email: "leadtaker@ninjacart.com", password: "demo123456", full_name: "Priya Patel", role: "lead_taker" },
      { email: "kam@ninjacart.com", password: "demo123456", full_name: "Vikram Singh", role: "kam" },
      { email: "admin@ninjacart.com", password: "demo123456", full_name: "Anita Desai", role: "admin" },
    ];

    const results = [];

    for (const u of demoUsers) {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((x: any) => x.email === u.email);

      if (existing) {
        // Ensure role exists
        await supabase.from("user_roles").upsert(
          { user_id: existing.id, role: u.role },
          { onConflict: "user_id,role" }
        );
        results.push({ email: u.email, status: "already exists" });
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }

      // Insert role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: u.role });
      results.push({ email: u.email, status: "created" });
    }

    // Seed pincode mappings
    await supabase.from("pincode_persona_map").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const pincodeMap = [
      { pincode: "560034", locality: "Koramangala", user_email: "agent@ninjacart.com", role: "calling_agent" },
      { pincode: "560095", locality: "Whitefield", user_email: "agent@ninjacart.com", role: "calling_agent" },
      { pincode: "560034", locality: "Koramangala", user_email: "leadtaker@ninjacart.com", role: "lead_taker" },
      { pincode: "560038", locality: "Indiranagar", user_email: "leadtaker@ninjacart.com", role: "lead_taker" },
      { pincode: "560095", locality: "Whitefield", user_email: "leadtaker@ninjacart.com", role: "lead_taker" },
      { pincode: "560034", locality: "Koramangala", user_email: "kam@ninjacart.com", role: "kam" },
      { pincode: "560038", locality: "Indiranagar", user_email: "kam@ninjacart.com", role: "kam" },
      { pincode: "560095", locality: "Whitefield", user_email: "kam@ninjacart.com", role: "kam" },
      { pincode: "560008", locality: "Jayanagar", user_email: "kam@ninjacart.com", role: "kam" },
      { pincode: "560001", locality: "MG Road", user_email: "kam@ninjacart.com", role: "kam" },
      { pincode: "560034", locality: "Koramangala", user_email: "admin@ninjacart.com", role: "admin" },
      { pincode: "560038", locality: "Indiranagar", user_email: "admin@ninjacart.com", role: "admin" },
      { pincode: "560095", locality: "Whitefield", user_email: "admin@ninjacart.com", role: "admin" },
      { pincode: "560008", locality: "Jayanagar", user_email: "admin@ninjacart.com", role: "admin" },
      { pincode: "560001", locality: "MG Road", user_email: "admin@ninjacart.com", role: "admin" },
    ];
    await supabase.from("pincode_persona_map").insert(pincodeMap);

    // Seed config data
    await supabase.from("sku_mapping").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("sku_mapping").insert([
      { grammage: 150, sku_name: "Hass Avocado 150g", lot_size: 4, box_count: 20 },
      { grammage: 180, sku_name: "Hass Avocado 180g", lot_size: 4.5, box_count: 16 },
      { grammage: 220, sku_name: "Hass Avocado 220g", lot_size: 5.5, box_count: 16 },
      { grammage: 280, sku_name: "Hass Avocado 280g", lot_size: 5, box_count: 12 },
      { grammage: 350, sku_name: "Hass Avocado 350g", lot_size: 6.5, box_count: 18 },
    ]);

    await supabase.from("stage_mapping").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("stage_mapping").insert([
      { consumption_days_min: 0, consumption_days_max: 1, stage_number: 4, stage_description: "Ready to Eat (Dark/Soft)" },
      { consumption_days_min: 2, consumption_days_max: 2, stage_number: 3, stage_description: "Near Ripe (Breaking Color)" },
      { consumption_days_min: 3, consumption_days_max: 4, stage_number: 2, stage_description: "Turning (Lightening)" },
      { consumption_days_min: 5, consumption_days_max: 99, stage_number: 1, stage_description: "Hard Green (Fresh Import)" },
    ]);

    await supabase.from("delivery_slots").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("delivery_slots").insert([
      { slot_name: "Morning: 9 AM–12 PM", start_time: "09:00", end_time: "12:00", is_active: true },
      { slot_name: "Afternoon: 12 PM–3 PM", start_time: "12:00", end_time: "15:00", is_active: true },
    ]);

    await supabase.from("distribution_partners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("distribution_partners").insert([
      { name: "DP-Koramangala", city: "Bangalore", status: "active", commission_pct: 8, area_coverage: "Koramangala, HSR Layout" },
      { name: "DP-Indiranagar", city: "Bangalore", status: "active", commission_pct: 7.5, area_coverage: "Indiranagar, CV Raman Nagar" },
      { name: "DP-Whitefield", city: "Bangalore", status: "active", commission_pct: 9, area_coverage: "Whitefield, Marathahalli" },
      { name: "DP-Central", city: "Bangalore", status: "active", commission_pct: 7, area_coverage: "MG Road, Jayanagar, Basavanagudi" },
    ]);

    await supabase.from("drop_reasons").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("drop_reasons").insert([
      { step_number: 2, reason_text: "Not Interested", is_active: true },
      { step_number: 2, reason_text: "Not Reachable", is_active: true },
      { step_number: 2, reason_text: "Wrong Contact", is_active: true },
      { step_number: 2, reason_text: "Other", is_active: true },
      { step_number: 3, reason_text: "Price Too High", is_active: true },
      { step_number: 3, reason_text: "Quality Not Matching", is_active: true },
      { step_number: 3, reason_text: "Competitor Lock-in", is_active: true },
      { step_number: 3, reason_text: "No Demand", is_active: true },
      { step_number: 3, reason_text: "Other", is_active: true },
      { step_number: 4, reason_text: "Quality Negative", is_active: true },
      { step_number: 4, reason_text: "Commercial Terms Issue", is_active: true },
      { step_number: 4, reason_text: "Other", is_active: true },
    ]);
    // Update some leads to qualified with rich data
    const { data: allLeads } = await supabase.from("leads").select("id, status").order("created_at", { ascending: false }).limit(20);
    if (allLeads && allLeads.length > 0) {
      const toQualify = allLeads.filter((l: any) => l.status !== "qualified").slice(0, 4);
      const qualifyData = [
        { purchase_manager_name: "Ramesh Kumar", pm_contact: "9876543210", avocado_consumption: "5-10 kg/week", estimated_monthly_spend: 15000, contact_number: "9988776655" },
        { purchase_manager_name: "Priya Sharma", pm_contact: "9123456780", avocado_consumption: "3-5 kg/week", estimated_monthly_spend: 8000, contact_number: "9900112233" },
        { purchase_manager_name: "Anil Mehta", pm_contact: "9345678901", avocado_consumption: "10-15 kg/week", estimated_monthly_spend: 25000, contact_number: "9012345678" },
        { purchase_manager_name: "Deepa Nair", pm_contact: "9567890123", avocado_consumption: "8-12 kg/week", estimated_monthly_spend: 20000, contact_number: "9234567890" },
      ];
      for (let i = 0; i < toQualify.length; i++) {
        await supabase.from("leads").update({ status: "qualified", ...qualifyData[i] }).eq("id", toQualify[i].id);
      }

      // Add pending_visit sample orders for first 2 qualified leads
      const { data: qualifiedLeads } = await supabase.from("leads").select("id").eq("status", "qualified").limit(2);
      if (qualifiedLeads && qualifiedLeads.length >= 2) {
        // Check if orders already exist for these leads
        const { data: existingOrders } = await supabase.from("sample_orders").select("lead_id").in("lead_id", qualifiedLeads.map((l: any) => l.id));
        const existingLeadIds = new Set((existingOrders || []).map((o: any) => o.lead_id));
        const newOrders = [];
        if (!existingLeadIds.has(qualifiedLeads[0].id)) {
          newOrders.push({ lead_id: qualifiedLeads[0].id, status: "pending_visit", delivery_address: "45 Church Street, Koramangala", delivery_date: "2026-02-18", sample_qty_units: 5, demand_per_week_kg: 8, remarks: "Interested in Hass variety, stage 3-4 ripeness", visit_date: "2026-02-15" });
        }
        if (!existingLeadIds.has(qualifiedLeads[1].id)) {
          newOrders.push({ lead_id: qualifiedLeads[1].id, status: "pending_visit", delivery_address: "12 MG Road, Brigade Layout", delivery_date: "2026-02-20", sample_qty_units: 3, demand_per_week_kg: 5, remarks: "Trial order for new menu items", visit_date: "2026-02-17" });
        }
        if (newOrders.length > 0) {
          await supabase.from("sample_orders").insert(newOrders);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
