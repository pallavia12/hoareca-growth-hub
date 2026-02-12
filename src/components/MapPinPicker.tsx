import { useState, useRef, useEffect, useCallback } from "react";
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

const BANGALORE_CENTER: L.LatLngTuple = [12.9716, 77.5946];
const BANGALORE_BOUNDS: L.LatLngBoundsExpression = [
  [12.75, 77.35],
  [13.18, 77.85],
];

interface MapPinPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function MapPinPicker({ lat, lng, onLocationSelect }: MapPinPickerProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  // Keep callback ref up to date without re-running effect
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center: L.LatLngTuple = lat && lng ? [lat, lng] : BANGALORE_CENTER;

    const map = L.map(mapRef.current, {
      center,
      zoom: 13,
      maxBounds: BANGALORE_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // Place initial marker if coords provided
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      // Update marker
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon }).addTo(map);
      }

      onLocationSelectRef.current(clickLat, clickLng);
    });

    // Fix tile rendering inside dialog by invalidating size after a short delay
    setTimeout(() => map.invalidateSize(), 200);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker when lat/lng change externally (e.g. geolocation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !lat || !lng) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelectRef.current(pos.coords.latitude, pos.coords.longitude);
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true }
    );
  }, []);

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
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>
      {lat && lng && (
        <p className="text-[10px] text-muted-foreground">
          📍 {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
