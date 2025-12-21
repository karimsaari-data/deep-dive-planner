import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "admin" | "organizer" | "member";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        setRoles([]);
      } else {
        setRoles(data?.map((r) => r.role as AppRole) ?? []);
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isOrganizer = roles.includes("organizer") || isAdmin;
  const isMember = roles.includes("member") || isOrganizer;

  return { roles, isAdmin, isOrganizer, isMember, loading };
};
