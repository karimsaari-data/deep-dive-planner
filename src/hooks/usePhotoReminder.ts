import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Rappel une fois par session (sessionStorage, par utilisateur) si le
// membre connecté n'a pas encore de photo de profil.
export const usePhotoReminder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Même queryKey que Profile.tsx : partage le cache, pas de fetch en double.
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !profile || profile.avatar_url) return;

    const key = `photo-reminder-shown-${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    toast.info("Vous n'avez pas encore de photo de profil", {
      description: "Ajoutez-en une pour apparaître dans le trombinoscope.",
      action: {
        label: "Ajouter une photo",
        onClick: () => navigate("/profile"),
      },
      duration: 10000,
    });
  }, [user, profile, navigate]);
};
