import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Waves, Calendar, User, Settings, LogOut, Image, Camera, FileText, MapIcon, CloudSun, Package, Users, Shield, Eye, EyeOff, ChevronDown, MoreHorizontal, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsCurrentUserEncadrant } from "@/hooks/useIsCurrentUserEncadrant";
import { useViewMode } from "@/contexts/ViewModeContext";
import { cn } from "@/lib/utils";
import logoTeamOxygen from "@/assets/logo-team-oxygen.webp";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, isOrganizer } = useUserRole();
  const { data: isEncadrantFromDirectory } = useIsCurrentUserEncadrant();
  const { isMemberPreview, toggleMemberPreview } = useViewMode();

  const [menuOpen, setMenuOpen] = useState(false);

  // Determine if user is an encadrant (either from directory or has organizer role)
  const realIsEncadrant = isOrganizer || isEncadrantFromDirectory;
  // In member preview mode, override encadrant/organizer flags for nav display
  const isEncadrant = isMemberPreview ? false : realIsEncadrant;
  const effectiveIsOrganizer = isMemberPreview ? false : isOrganizer;
  const canTogglePreview = realIsEncadrant || isAdmin;

  // Pages accessibles uniquement en vue membre (cachées pour les encadrants)
  const memberOnlyRoutes = ["/souvenirs"];
  const handleTogglePreview = () => {
    const isLeavingMemberView = isMemberPreview && memberOnlyRoutes.includes(location.pathname);
    toggleMemberPreview();
    if (isLeavingMemberView) navigate("/");
  };

  // Entrées toujours visibles (usage quotidien)
  const primaryItems = useMemo(() => {
    const items = [
      { to: "/", label: "Sorties", icon: Waves },
      { to: "/reservations", label: "Mes Réservations", icon: Calendar },
    ];

    if (effectiveIsOrganizer) {
      items.push({ to: "/mes-sorties", label: "Mes Sorties", icon: FileText });
    }

    items.push(
      { to: "/album", label: "Album", icon: Camera },
      { to: "/map", label: "Carte", icon: MapIcon },
      { to: "/weather", label: "Météo", icon: CloudSun },
      { to: "/trombinoscope", label: "Trombi", icon: Users },
    );

    if (isAdmin) {
      items.push({ to: "/admin", label: "Administration", icon: Settings });
    }

    return items;
  }, [isAdmin, effectiveIsOrganizer]);

  // Entrées regroupées dans le menu « Plus »
  const moreItems = useMemo(() => {
    const items: { to: string; label: string; icon: typeof Waves }[] = [];

    // For encadrants: hide Souvenirs to save space for more important tools
    if (!isEncadrant) {
      items.push({ to: "/souvenirs", label: "Souvenirs", icon: Image });
    }

    // Sécurité : visible par tous. Les encadrants y trouvent en plus la
    // procédure « En cas d'accident » et les déclarations.
    items.push({ to: "/security", label: "Sécurité", icon: Shield });

    if (isEncadrant) {
      items.push({ to: "/equipment", label: "Matériel", icon: Package });
    }

    if (effectiveIsOrganizer) {
      items.push({ to: "/archives", label: "Archives", icon: FileText });
    }

    return items;
  }, [effectiveIsOrganizer, isEncadrant]);

  // Liste complète à plat (utilisée par le menu mobile)
  const navItems = useMemo(
    () => [...primaryItems, ...moreItems],
    [primaryItems, moreItems]
  );

  // Le menu mobile se referme à chaque changement de page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md" style={{ background: "rgba(1,12,28,0.85)" }}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="tap-link flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-75">
          <img
            src={logoTeamOxygen}
            alt="My Oxygen"
            className="h-8 w-8 object-contain"
            style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }}
          />
          <span className="text-sm font-semibold tracking-widest text-white/85 uppercase">My Oxygen</span>
        </Link>

        {user && (
          <nav className="hidden flex-1 items-center justify-center gap-1 overflow-hidden lg:flex">
            {primaryItems.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1.5 transition-all text-white/70 hover:text-white hover:bg-white/10 px-2",
                    isActive(to) && "bg-white/15 text-white"
                  )}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{label}</span>
                </Button>
              </Link>
            ))}

            {moreItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1.5 transition-all text-white/70 hover:text-white hover:bg-white/10 px-2",
                      moreItems.some((i) => isActive(i.to)) && "bg-white/15 text-white"
                    )}
                    title="Plus"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden xl:inline">Plus</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {moreItems.map(({ to, label, icon: Icon }) => (
                    <DropdownMenuItem key={to} asChild>
                      <Link to={to} className={cn("gap-2 cursor-pointer", isActive(to) && "bg-accent")}>
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        )}

        <div className="flex flex-shrink-0 items-center gap-3">
          {user ? (
            <>
              {canTogglePreview && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTogglePreview}
                  title={isMemberPreview ? "Repasser en vue encadrant" : "Simuler vue membre"}
                  className={cn(
                    "rounded-full hidden lg:flex",
                    isMemberPreview
                      ? "text-amber-300 hover:text-amber-200 hover:bg-amber-500/15 ring-1 ring-amber-400/40"
                      : "text-white/40 hover:text-white/70 hover:bg-white/10"
                  )}
                >
                  {isMemberPreview ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              )}
              <Link to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                onClick={signOut}
                className="hidden gap-2 rounded-full text-red-300 hover:bg-red-500/15 hover:text-red-200 lg:inline-flex"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden lg:inline">Déconnexion</span>
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Ouvrir le menu"
                    className="rounded-full text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" aria-describedby={undefined} className="w-72 max-w-[85vw] overflow-y-auto">
                  <SheetTitle className="mb-4">Menu</SheetTitle>
                  <nav className="flex flex-col gap-1">
                    {navItems.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        aria-current={isActive(to) ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted",
                          isActive(to) && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="mt-2 flex min-h-11 items-center gap-3 rounded-md border-t border-border px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Déconnexion
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="ocean">Se connecter</Button>
            </Link>
          )}
        </div>
      </div>

    </header>
  );
};

export default Header;
