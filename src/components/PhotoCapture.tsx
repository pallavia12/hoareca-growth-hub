import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  value: string | null;
  onCapture: (url: string | null) => void;
}

export default function PhotoCapture({ label, required, value, onCapture }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      onCapture(urlData.publicUrl);
    } catch (e) {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {value ? (
        <div className="relative w-full h-32 rounded-md overflow-hidden border">
          <img src={value} alt="Captured" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onCapture(null)}
            className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive/20"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs h-9"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : <><Camera className="w-3 h-3 mr-1" /> Capture Photo</>}
        </Button>
      )}
    </div>
  );
}
