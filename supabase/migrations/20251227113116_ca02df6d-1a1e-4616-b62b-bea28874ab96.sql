-- Create equipment status enum
CREATE TYPE public.equipment_status AS ENUM ('disponible', 'prêté', 'perdu', 'cassé', 'rebuté');

-- Create equipment catalog table (generic items created by admins)
CREATE TABLE public.equipment_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment inventory table (individual items assigned to organizers)
CREATE TABLE public.equipment_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID NOT NULL REFERENCES public.equipment_catalog(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status equipment_status NOT NULL DEFAULT 'disponible',
  notes TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment history table (track all movements and status changes)
CREATE TABLE public.equipment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.equipment_inventory(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'transfer', 'status_change', 'acquisition', 'decommission'
  from_user_id UUID REFERENCES public.profiles(id),
  to_user_id UUID REFERENCES public.profiles(id),
  old_status equipment_status,
  new_status equipment_status,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_history ENABLE ROW LEVEL SECURITY;

-- Catalog policies (admins manage, organizers/admins can view)
CREATE POLICY "Admins can manage catalog"
ON public.equipment_catalog
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers can view catalog"
ON public.equipment_catalog
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

-- Inventory policies
CREATE POLICY "Organizers can view all inventory"
ON public.equipment_inventory
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can manage their own inventory"
ON public.equipment_inventory
FOR ALL
USING (is_encadrant_or_admin(auth.uid()) AND owner_id = auth.uid());

CREATE POLICY "Organizers can insert inventory"
ON public.equipment_inventory
FOR INSERT
WITH CHECK (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can update any inventory for transfers"
ON public.equipment_inventory
FOR UPDATE
USING (is_encadrant_or_admin(auth.uid()));

-- History policies
CREATE POLICY "Organizers can view history"
ON public.equipment_history
FOR SELECT
USING (is_encadrant_or_admin(auth.uid()));

CREATE POLICY "Organizers can insert history"
ON public.equipment_history
FOR INSERT
WITH CHECK (is_encadrant_or_admin(auth.uid()));

-- Create indexes
CREATE INDEX idx_equipment_inventory_owner ON public.equipment_inventory(owner_id);
CREATE INDEX idx_equipment_inventory_catalog ON public.equipment_inventory(catalog_id);
CREATE INDEX idx_equipment_inventory_status ON public.equipment_inventory(status);
CREATE INDEX idx_equipment_history_inventory ON public.equipment_history(inventory_id);

-- Create triggers for updated_at
CREATE TRIGGER update_equipment_catalog_updated_at
BEFORE UPDATE ON public.equipment_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_inventory_updated_at
BEFORE UPDATE ON public.equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();