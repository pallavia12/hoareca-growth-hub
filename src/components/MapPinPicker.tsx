import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { MapPin, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapPinPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function MapPinPicker({ lat, lng, onLocationSelect }: MapPinPickerProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore
  const center: [number, number] = lat && lng ? [lat, lng] : defaultCenter;

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Pin Location
        </p>
        <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={handleGeolocate} disabled={geoLoading}>
          <Crosshair className="w-3 h-3 mr-1" /> {geoLoading ? "Locating..." : "Use My Location"}
        </Button>
      </div>
      <div className="h-48 rounded-md overflow-hidden border">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} key={`${center[0]}-${center[1]}`}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onLocationSelect={onLocationSelect} />
          {lat && lng && <Marker position={[lat, lng]} icon={icon} />}
        </MapContainer>
      </div>
      {lat && lng && (
        <p className="text-[10px] text-muted-foreground">
          📍 {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
