import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

import slide1 from "@/assets/brochure/slide-1.jpg";
import slide2 from "@/assets/brochure/slide-2.jpg";
import slide3 from "@/assets/brochure/slide-3.jpg";
import slide4 from "@/assets/brochure/slide-4.jpg";
import slide5 from "@/assets/brochure/slide-5.jpg";

const slides = [
  { src: slide1, title: "Product Catalog" },
  { src: slide2, title: "SKU Range" },
  { src: slide3, title: "Ripeness Stages" },
  { src: slide4, title: "Delivery & Logistics" },
  { src: slide5, title: "Contact & Pricing" },
];

export default function AvocadoBrochureCarousel() {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(i => (i === 0 ? slides.length - 1 : i - 1)), []);
  const next = useCallback(() => setCurrent(i => (i === slides.length - 1 ? 0 : i + 1)), []);

  const handleDownloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1024, 576] });

    for (let i = 0; i < slides.length; i++) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = slides[i].src;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
      if (i > 0) pdf.addPage([1024, 576], "landscape");
      pdf.addImage(img, "JPEG", 0, 0, 1024, 576);
    }

    pdf.save("Avocado-Product-Brochure.pdf");
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">🥑 Avocado Product Brochure</p>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadPdf}>
            <Download className="w-3 h-3" /> Download PDF
          </Button>
        </div>

        <div className="relative">
          <img
            src={slides[current].src}
            alt={slides[current].title}
            className="w-full rounded-md aspect-video object-cover"
          />

          <Button
            variant="secondary"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
            onClick={prev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
            onClick={next}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/70 rounded-full px-2 py-0.5 text-[10px] text-foreground backdrop-blur-sm">
            {slides[current].title} · {current + 1}/{slides.length}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                i === current ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
