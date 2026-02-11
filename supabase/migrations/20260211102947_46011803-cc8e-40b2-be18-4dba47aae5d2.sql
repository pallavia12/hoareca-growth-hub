
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('calling_agent', 'lead_taker', 'kam', 'admin');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can read their own roles, admins can read all
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Pincode persona mapping
CREATE TABLE public.pincode_persona_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode TEXT NOT NULL,
  locality TEXT NOT NULL,
  user_email TEXT NOT NULL,
  role app_role NOT NULL
);
ALTER TABLE public.pincode_persona_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read pincode map" ON public.pincode_persona_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pincode map" ON public.pincode_persona_map FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Prospects
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode TEXT NOT NULL,
  locality TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  location TEXT,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  source TEXT,
  cuisine_type TEXT,
  mapped_to TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read prospects" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert prospects" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update prospects" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete prospects" ON public.prospects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES public.prospects(id),
  client_name TEXT NOT NULL,
  outlet_address TEXT,
  pincode TEXT NOT NULL,
  locality TEXT,
  geo_lat NUMERIC,
  geo_lng NUMERIC,
  contact_number TEXT,
  outlet_photo_url TEXT,
  gst_id TEXT,
  avocado_consumption TEXT,
  avocado_variety TEXT,
  purchase_manager_name TEXT,
  pm_contact TEXT,
  franchised BOOLEAN DEFAULT false,
  current_supplier TEXT,
  estimated_monthly_spend NUMERIC,
  appointment_date DATE,
  appointment_time TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  call_count INT DEFAULT 0,
  visit_count INT DEFAULT 0,
  last_activity_date TIMESTAMPTZ,
  remarks TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sample Orders
CREATE TABLE public.sample_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) NOT NULL,
  visit_date DATE,
  gst_photo_url TEXT,
  demand_per_week_kg NUMERIC,
  sample_qty_units INT,
  delivery_date DATE,
  delivery_address TEXT,
  delivery_slot TEXT,
  status TEXT NOT NULL DEFAULT 'pending_visit',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sample_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sample_orders" ON public.sample_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sample_orders" ON public.sample_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update sample_orders" ON public.sample_orders FOR UPDATE TO authenticated USING (true);

-- Avocado Specs
CREATE TABLE public.avocado_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_order_id UUID REFERENCES public.sample_orders(id) NOT NULL,
  consumption_days INT NOT NULL,
  stage TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  box_count INT,
  grammage INT,
  sku_name TEXT
);
ALTER TABLE public.avocado_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read avocado_specs" ON public.avocado_specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert avocado_specs" ON public.avocado_specs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update avocado_specs" ON public.avocado_specs FOR UPDATE TO authenticated USING (true);

-- Agreements
CREATE TABLE public.agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_order_id UUID REFERENCES public.sample_orders(id) NOT NULL,
  quality_feedback BOOLEAN,
  quality_remarks TEXT,
  pricing_type TEXT,
  agreed_price_per_kg NUMERIC,
  outlets_in_bangalore INT,
  other_cities TEXT[],
  payment_type TEXT,
  credit_days INT,
  delivery_slot TEXT,
  distribution_partner TEXT,
  other_skus TEXT[],
  mail_id TEXT,
  esign_status TEXT DEFAULT 'not_sent',
  expected_first_order_date DATE,
  expected_weekly_volume_kg NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending_feedback',
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read agreements" ON public.agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update agreements" ON public.agreements FOR UPDATE TO authenticated USING (true);

-- Activity Logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  action TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_state TEXT,
  after_state TEXT,
  notes TEXT
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- SKU Mapping
CREATE TABLE public.sku_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grammage INT NOT NULL,
  sku_name TEXT NOT NULL,
  lot_size NUMERIC,
  box_count INT
);
ALTER TABLE public.sku_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read sku_mapping" ON public.sku_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sku_mapping" ON public.sku_mapping FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Stage Mapping
CREATE TABLE public.stage_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumption_days_min INT NOT NULL,
  consumption_days_max INT NOT NULL,
  stage_number INT NOT NULL,
  stage_description TEXT NOT NULL
);
ALTER TABLE public.stage_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read stage_mapping" ON public.stage_mapping FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage stage_mapping" ON public.stage_mapping FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Delivery Slots
CREATE TABLE public.delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read delivery_slots" ON public.delivery_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage delivery_slots" ON public.delivery_slots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Distribution Partners
CREATE TABLE public.distribution_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Bangalore',
  status TEXT NOT NULL DEFAULT 'active',
  commission_pct NUMERIC,
  area_coverage TEXT
);
ALTER TABLE public.distribution_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read distribution_partners" ON public.distribution_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage distribution_partners" ON public.distribution_partners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Drop Reasons
CREATE TABLE public.drop_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INT NOT NULL,
  reason_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);
ALTER TABLE public.drop_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read drop_reasons" ON public.drop_reasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage drop_reasons" ON public.drop_reasons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  entity_id UUID,
  entity_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID,
  entity_type TEXT,
  restaurant_name TEXT NOT NULL,
  appointment_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON public.prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sample_orders_updated_at BEFORE UPDATE ON public.sample_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
