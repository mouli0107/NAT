import { createContext, useContext, useState, ReactNode } from "react";
import astraLogoPng from "@/assets/astra-logo.png";

export interface BrandProfile {
  id: string;
  label: string;
  platformName: string;
  platformShortName: string;
  subtitle: string;
  commandCenter: string;
  tagline: string;
  loginTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  logoType: "icon" | "image";
  logoSrc?: string;
  logoBackground?: string;
  accentColor: string;
  pdfTitle: string;
}

// Only ASTRA brand profile — multi-brand support removed.
// Keep the export shape so consumers using brandProfiles[id] don't break.
export const brandProfiles: Record<string, BrandProfile> = {
  astra: {
    id: "astra",
    label: "ASTRA",
    platformName: "ASTRA",
    platformShortName: "ASTRA",
    subtitle: "Agentic Testing",
    commandCenter: "ASTRA Agentic Testing Command Center",
    tagline: "ASTRA — Autonomous Testing Platform",
    loginTitle: "Log In to ASTRA",
    heroTitle: "ASTRA",
    heroSubtitle: "Agentic Testing Platform",
    logoType: "image",
    logoSrc: astraLogoPng,
    accentColor: "#1B2D8C",
    pdfTitle: "ASTRA Agentic Testing Platform",
  },
};

interface BrandingContextType {
  brand: BrandProfile;
  setBrand: (brandId: string) => void;
  brandId: string;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  // Brand is permanently locked to ASTRA — no user-switchable modes.
  // Clear any stale localStorage value so old "envestnet" / "gold" etc. don't persist.
  const [brandId] = useState<string>(() => {
    localStorage.setItem("selectedBrand", "astra");
    return "astra";
  });

  const brand = brandProfiles.astra;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setBrand = (_id: string) => { /* no-op — brand is locked to ASTRA */ };

  return (
    <BrandingContext.Provider value={{ brand, setBrand, brandId }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}
