import { cn } from "@/lib/utils";

// Default placeholder image - ocean/diving themed
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&auto=format&fit=crop&q=60";

interface LocationImageProps {
  photoUrl: string | null | undefined;
  locationName: string;
  className?: string;
  variant?: "thumbnail" | "card" | "hero";
}

const LocationImage = ({ 
  photoUrl, 
  locationName, 
  className,
  variant = "card" 
}: LocationImageProps) => {
  const imageUrl = photoUrl || PLACEHOLDER_IMAGE;
  
  const variantClasses = {
    thumbnail: "h-12 w-12 rounded-lg",
    card: "h-32 w-full rounded-t-lg",
    hero: "h-64 w-full rounded-xl",
  };

  return (
    <div className={cn("relative overflow-hidden bg-muted", variantClasses[variant], className)}>
      <img
        src={imageUrl}
        alt={locationName}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = PLACEHOLDER_IMAGE;
        }}
      />
      {!photoUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-ocean-deep/20">
          <span className="text-xs text-foam/80 font-medium px-2 py-1 bg-ocean-deep/40 rounded backdrop-blur-sm">
            {locationName}
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationImage;
