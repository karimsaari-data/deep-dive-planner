import { useState } from "react";
import { Trash2, MapPin, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Waypoint, WaypointType, getWaypointLabel, getWaypointColor, getWaypointIcon } from "@/hooks/useWaypoints";
import { useDeleteWaypoint } from "@/hooks/useWaypoints";

interface WaypointTableProps {
  waypoints: Waypoint[];
  siteId: string;
  onFocusWaypoint?: (waypoint: Waypoint) => void;
}

const ALL_TYPES: WaypointType[] = ["parking", "water_entry", "water_exit", "meeting_point", "dive_zone"];

const WaypointTable = ({ waypoints, siteId, onFocusWaypoint }: WaypointTableProps) => {
  const deleteWaypoint = useDeleteWaypoint();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = typeFilter === "all"
    ? waypoints
    : waypoints.filter(w => w.point_type === typeFilter);

  if (waypoints.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          Points d'interet ({waypoints.length})
        </Label>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {ALL_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px]"
                      style={{
                        backgroundColor: type === "dive_zone" ? "rgba(14,165,233,0.4)" : getWaypointColor(type),
                        border: type === "dive_zone" ? "1.5px solid #0ea5e9" : "none",
                        color: type === "dive_zone" ? "#0ea5e9" : "white",
                      }}
                    >
                      {getWaypointIcon(type)}
                    </span>
                    {getWaypointLabel(type)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead className="w-10"></TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Coordonnees GPS</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((waypoint, index) => (
              <TableRow
                key={waypoint.id}
                className="cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => onFocusWaypoint?.(waypoint)}
              >
                <TableCell className="text-center font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs mx-auto"
                    style={{
                      backgroundColor: waypoint.point_type === "dive_zone"
                        ? "rgba(14, 165, 233, 0.4)"
                        : getWaypointColor(waypoint.point_type),
                      border: waypoint.point_type === "dive_zone" ? "2px solid #0ea5e9" : "2px solid white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      color: waypoint.point_type === "dive_zone" ? "#0ea5e9" : "white",
                      fontWeight: "bold",
                    }}
                  >
                    {getWaypointIcon(waypoint.point_type)}
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {getWaypointLabel(waypoint.point_type)}
                </TableCell>
                <TableCell className="text-sm">
                  {waypoint.name}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {waypoint.latitude.toFixed(5)}, {waypoint.longitude.toFixed(5)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWaypoint.mutate({ id: waypoint.id, siteId });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {typeFilter !== "all" && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Aucun point de type "{getWaypointLabel(typeFilter as WaypointType)}"
        </p>
      )}
    </div>
  );
};

export default WaypointTable;
