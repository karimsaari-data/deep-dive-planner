import { useState } from "react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileDirectory } from "@/hooks/useProfileDirectory";
import { useOwnLicense } from "@/hooks/useOwnLicense";
import { getCurrentSeasonYear } from "@/hooks/useMembershipYearlyStatus";

// Message d'alerte (une fois fermé, masqué pour la session) si la licence de
// la saison en cours est absente, expirée ou expire dans 30 jours ou moins.
const LicenseReminderBanner = () => {
  const { user } = useAuth();
  const { directoryProfile } = useProfileDirectory(user?.email);
  const season = getCurrentSeasonYear();
  const { license, isLoading } = useOwnLicense(season, directoryProfile?.id);

  const storageKey = user ? `license-reminder-dismissed-${user.id}-${season}` : null;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!storageKey && sessionStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });

  // Adhérent introuvable dans le fichier : pas de licence à réclamer.
  if (!user || !directoryProfile || isLoading || dismissed) return null;

  let message: string | null = null;
  if (!license?.license_expiry_date) {
    message = "Vous n'avez pas encore déposé votre licence de la saison.";
  } else {
    const days = differenceInCalendarDays(new Date(license.license_expiry_date), new Date());
    if (days < 0) message = "Votre licence est expirée.";
    else if (days <= 30) message = `Votre licence expire dans ${days} jour${days > 1 ? "s" : ""}.`;
  }
  if (!message) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      if (storageKey) sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage indisponible : masqué jusqu'au prochain rendu seulement
    }
  };

  return (
    <div role="alert" className="border-b border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <div className="container mx-auto flex items-center gap-3 px-4 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          {message}{" "}
          <Link to="/profile" className="font-medium underline">
            Mettre à jour ma licence
          </Link>
        </p>
        <button type="button" onClick={dismiss} aria-label="Fermer" className="shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default LicenseReminderBanner;
