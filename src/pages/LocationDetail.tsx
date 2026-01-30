import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  MapPin, 
  Navigation, 
  Waves, 
  ArrowLeft, 
  Loader2,
  Compass,
  Info,
  ExternalLink,
  Anchor
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LocationImage from "@/components/locations/LocationImage";
import MarineMiniMap from "@/components/locations/MarineMiniMap";
import { supabase } from "@/integrations/supabase/client";
import type { Location } from "@/hooks/useLocations";

const LocationDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: location, isLoading } = useQuery({
    queryKey: ["location", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Location | null;
    },
    enabled: !!id,
  });

  const openNavigation = (app: "google" | "waze") => {
    if (!location?.latitude || !location?.longitude) return;
    
    const { latitude, longitude } = location;
    
    if (app === "google") {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
        "_blank"
      );
    } else {
      window.open(
        `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`,
        "_blank"
      );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!location) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Lieu non trouvé</p>
          <Link to="/map">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la carte
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const hasCoordinates = location.latitude && location.longitude;

  return (
    <Layout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back button */}
          <Link to="/map" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Retour à la carte
          </Link>

          {/* Hero image */}
          <LocationImage 
            photoUrl={location.photo_url} 
            locationName={location.name}
            variant="hero"
            className="mb-6 shadow-elevated"
          />

          {/* Title and badges */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {location.type && (
                <Badge variant="secondary" className="text-sm">
                  {location.type}
                </Badge>
              )}
              {location.max_depth && (
                <Badge variant="outline" className="text-sm gap-1">
                  <Waves className="h-3 w-3" />
                  Prof. max: {location.max_depth}m
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground">{location.name}</h1>
            {location.address && (
              <p className="mt-2 text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {location.address}
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Navigation Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Navigation className="h-5 w-5 text-primary" />
                  Navigation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasCoordinates ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Coordonnées : {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="ocean" 
                        className="w-full gap-2"
                        onClick={() => openNavigation("google")}
                      >
                        <Compass className="h-4 w-4" />
                        Ouvrir dans Google Maps
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => openNavigation("waze")}
                      >
                        <Navigation className="h-4 w-4" />
                        Ouvrir dans Waze
                      </Button>
                    </div>
                    {location.maps_url && (
                      <a 
                        href={location.maps_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Lien Google Maps original
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      Coordonnées GPS non disponibles
                    </p>
                    {location.maps_url && (
                      <a 
                        href={location.maps_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir sur Google Maps
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Marine Chart Mini Map */}
            {hasCoordinates && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Anchor className="h-5 w-5 text-primary" />
                    Carte Marine (Bathymétrie)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-lg">
                  <MarineMiniMap
                    latitude={location.latitude!}
                    longitude={location.longitude!}
                    siteName={location.name}
                    siteId={location.id}
                  />
                  <p className="text-xs text-muted-foreground text-center py-2 px-3">
                    Carte SHOM/IGN – Lignes de profondeur et sondes marines
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5 text-primary" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location.max_depth && (
                  <div className="mb-4 p-3 rounded-lg bg-ocean-light/10 border border-ocean-light/20">
                    <p className="text-sm text-muted-foreground">Profondeur maximale</p>
                    <p className="text-2xl font-bold text-ocean-deep">{location.max_depth}m</p>
                  </div>
                )}
                
                {location.comments ? (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Commentaires</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {location.comments}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune information complémentaire
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default LocationDetail;
