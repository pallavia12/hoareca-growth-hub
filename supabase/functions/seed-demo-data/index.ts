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
      { email: "likhitha@ninjacart.com", password: "123456", full_name: "Likhitha", role: "kam" },
      { email: "tanmoy@ninjacart.com", password: "123456", full_name: "Tanmoy", role: "kam" },
      { email: "sonu@ninjacart.com", password: "123456", full_name: "Sonu", role: "kam" },
      { email: "srihari@ninjacart.com", password: "123456", full_name: "Srihari", role: "kam" },
      { email: "stalin@ninjacart.com", password: "123456", full_name: "Stalin", role: "calling_agent" },
      { email: "yashaswini@ninjacart.com", password: "123456", full_name: "Yashaswini", role: "calling_agent" },
      { email: "rkgnanajyothi@ninjacart.com", password: "123456", full_name: "R K Gnana Jyothi", role: "calling_agent" },
      { email: "mbanu@ninjacart.com", password: "123456", full_name: "M Banu", role: "calling_agent" },
      { email: "anushan@ninjacart.com", password: "123456", full_name: "Anusha N", role: "calling_agent" },
      { email: "preethi@ninjacart.com", password: "123456", full_name: "Preethi", role: "lead_taker" },
      { email: "admin123@ninjacart.com", password: "123456", full_name: "Admin123", role: "admin" },
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
      // KAM - Likhitha
      { pincode: "560001", locality: "560001", user_email: "likhitha@ninjacart.com", role: "kam" },
      { pincode: "560025", locality: "560025", user_email: "likhitha@ninjacart.com", role: "kam" },
      { pincode: "560066", locality: "560066", user_email: "likhitha@ninjacart.com", role: "kam" },
      // KAM - Tanmoy
      { pincode: "560102", locality: "560102", user_email: "tanmoy@ninjacart.com", role: "kam" },
      { pincode: "560103", locality: "560103", user_email: "tanmoy@ninjacart.com", role: "kam" },
      // KAM - Sonu
      { pincode: "560066", locality: "560066", user_email: "sonu@ninjacart.com", role: "kam" },
      { pincode: "560048", locality: "560048", user_email: "sonu@ninjacart.com", role: "kam" },
      // KAM - Srihari
      { pincode: "560078", locality: "560078", user_email: "srihari@ninjacart.com", role: "kam" },
      { pincode: "560102", locality: "560102", user_email: "srihari@ninjacart.com", role: "kam" },
      { pincode: "560041", locality: "560041", user_email: "srihari@ninjacart.com", role: "kam" },
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
    // Seed 3 sample prospects with different tags
    const sampleProspects = [
      { restaurant_name: "The Avocado Café", pincode: "560034", locality: "Koramangala", location: "100ft Road, Koramangala 4th Block, Bangalore", source: "Google Maps", cuisine_type: "Cafe", tag: "New", status: "assigned", mapped_to: "agent@ninjacart.com" },
      { restaurant_name: "Tokyo Ramen House", pincode: "560001", locality: "MG Road", location: "Brigade Road, MG Road, Bangalore", source: "Zomato", cuisine_type: "Pan-Asian", tag: "In Progress", status: "assigned", mapped_to: "leadtaker@ninjacart.com" },
      { restaurant_name: "Green Bowl Kitchen", pincode: "560034", locality: "Indiranagar", location: "12th Main, HAL 2nd Stage, Indiranagar, Bangalore", source: "Referral", cuisine_type: "Continental", tag: "Qualified", status: "assigned", mapped_to: "kam@ninjacart.com" },
    ];
    for (const p of sampleProspects) {
      const { data: existing } = await supabase.from("prospects").select("id").eq("restaurant_name", p.restaurant_name).maybeSingle();
      if (existing) { await supabase.from("prospects").update(p).eq("id", existing.id); }
      else { await supabase.from("prospects").insert(p); }
    }

    // Ensure qualified leads
    const { data: allLeads } = await supabase.from("leads").select("id, status").order("created_at", { ascending: false }).limit(20);
    if (allLeads && allLeads.length > 0) {
      const toQualify = allLeads.filter((l: any) => l.status !== "qualified").slice(0, 2);
      const qualifyData = [
        { purchase_manager_name: "Ramesh Kumar", pm_contact: "9876543210", avocado_consumption: "yes_imported", estimated_monthly_spend: 15000, contact_number: "9988776655" },
        { purchase_manager_name: "Priya Sharma", pm_contact: "9123456780", avocado_consumption: "yes_indian", estimated_monthly_spend: 8000, contact_number: "9900112233" },
      ];
      for (let i = 0; i < toQualify.length; i++) {
        await supabase.from("leads").update({ status: "qualified", ...qualifyData[i] }).eq("id", toQualify[i].id);
      }
    }
    const { data: ql } = await supabase.from("leads").select("id").eq("status", "qualified").limit(1);
    if (!ql || ql.length === 0) {
      await supabase.from("leads").insert({ client_name: "The Avocado Café", pincode: "560034", locality: "Koramangala", outlet_address: "100ft Road, Koramangala 4th Block", contact_number: "+91 98765 43210", purchase_manager_name: "Ravi Kumar", pm_contact: "+91 98765 43211", status: "qualified", avocado_consumption: "yes_imported", estimated_monthly_spend: 25000 });
    }

    // Seed Step 4 sample data: leads → sample_orders → agreements
    const step4Leads = [
      { client_name: "Urban Bistro", pincode: "560034", locality: "Koramangala", contact_number: "9800000001", purchase_manager_name: "Amit R", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 2 },
      { client_name: "Brew House", pincode: "560038", locality: "Indiranagar", contact_number: "9800000002", purchase_manager_name: "Priya S", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 1 },
      { client_name: "Cloud Kitchen Co", pincode: "560095", locality: "Whitefield", contact_number: "9800000003", purchase_manager_name: "Raj M", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 3 },
      { client_name: "Spice Garden", pincode: "560001", locality: "MG Road", contact_number: "9800000004", purchase_manager_name: "Neha K", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 2 },
      { client_name: "Cafe Noir", pincode: "560034", locality: "Koramangala", contact_number: "9800000005", purchase_manager_name: "Vikram P", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 2 },
      { client_name: "Gourmet Hub", pincode: "560038", locality: "Indiranagar", contact_number: "9800000006", purchase_manager_name: "Sneha D", status: "qualified", created_by: "kam@ninjacart.com", visit_count: 3 },
    ];

    for (const sl of step4Leads) {
      const { data: existingLead } = await supabase.from("leads").select("id").eq("client_name", sl.client_name).maybeSingle();
      if (existingLead) continue;

      const { data: leadData } = await supabase.from("leads").insert(sl).select("id").single();
      if (!leadData) continue;

      // Create sample order for each
      const { data: orderData } = await supabase.from("sample_orders").insert({
        lead_id: leadData.id,
        status: "sample_delivered",
        remarks: "Sample delivered for Step 4 demo",
        delivery_date: "2026-02-13",
        sample_qty_units: 5,
        demand_per_week_kg: 15,
      }).select("id").single();
      if (!orderData) continue;

      // Create agreements for specific leads
      if (sl.client_name === "Cloud Kitchen Co") {
        await supabase.from("agreements").insert({
          sample_order_id: orderData.id,
          status: "signed",
          quality_feedback: true,
          pricing_type: "monthly",
          agreed_price_per_kg: 140,
          payment_type: "credit",
          credit_days: 15,
          outlets_in_bangalore: 3,
          delivery_slot: "9am-12pm",
          distribution_partner: "DP-Whitefield",
          expected_first_order_date: "2026-02-20",
          expected_weekly_volume_kg: 25,
          mail_id: "mgr@cloudkitchen.com",
          esign_status: "signed",
        });
      } else if (sl.client_name === "Spice Garden") {
        await supabase.from("agreements").insert({
          sample_order_id: orderData.id,
          status: "agreement_sent",
          quality_feedback: true,
          pricing_type: "weekly",
          agreed_price_per_kg: 135,
          payment_type: "cash_and_carry",
          outlets_in_bangalore: 1,
          delivery_slot: "12pm-3pm",
          distribution_partner: "DP-Central",
          expected_first_order_date: "2026-02-22",
          expected_weekly_volume_kg: 15,
          mail_id: "owner@spicegarden.in",
          esign_status: "sent",
        });
      } else if (sl.client_name === "Cafe Noir") {
        await supabase.from("agreements").insert({
          sample_order_id: orderData.id,
          status: "revisit_needed",
          quality_feedback: true,
          quality_remarks: "Liked the quality, discussing pricing",
          remarks: "[Re-visit: 17 Feb 2026 at 10:00] Feedback: positive. Discussing volume discounts.",
        });
      } else if (sl.client_name === "Gourmet Hub") {
        await supabase.from("agreements").insert({
          sample_order_id: orderData.id,
          status: "lost",
          quality_feedback: false,
          quality_remarks: "Too firm for their menu",
          remarks: "[Dropped] Quality Issues: Too firm, not suitable for their recipes. Total visits: 3",
        });
      }
      // Urban Bistro and Brew House have no agreement → Quality Pending
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
