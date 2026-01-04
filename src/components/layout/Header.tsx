import { Link, useLocation } from "react-router-dom";
import { Waves, Calendar, User, Settings, LogOut, Image, FileText, MapIcon, CloudSun, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isOrganizer } = useUserRole();

  const navItems = [
    { to: "/", label: "Sorties", icon: Waves },
    { to: "/reservations", label: "Mes Réservations", icon: Calendar },
    { to: "/souvenirs", label: "Souvenirs", icon: Image },
    { to: "/map", label: "Carte", icon: MapIcon },
    { to: "/weather", label: "Météo", icon: CloudSun },
  ];

  if (isOrganizer) {
    navItems.push({ to: "/mes-sorties", label: "Mes Sorties", icon: Calendar });
    navItems.push({ to: "/equipment", label: "Matériel", icon: Package });
    navItems.push({ to: "/archives", label: "Archives", icon: FileText });
  }

  if (isAdmin) {
    navItems.push({ to: "/admin", label: "Administration", icon: Settings });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Waves className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">Team Oxygen</span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button
                  variant={isActive(to) ? "secondary" : "ghost"}
                  className={cn("gap-2 transition-all", isActive(to) && "bg-secondary text-secondary-foreground")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={signOut} className="rounded-full">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ocean">Se connecter</Button>
            </Link>
          )}
        </div>
      </div>

      {user && (
        <nav className="flex justify-center gap-1 border-t border-border/50 bg-card p-2 md:hidden overflow-x-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button
                variant={isActive(to) ? "secondary" : "ghost"}
                size="sm"
                className={cn("gap-1.5 text-xs whitespace-nowrap", isActive(to) && "bg-secondary text-secondary-foreground")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
};

export default Header;
