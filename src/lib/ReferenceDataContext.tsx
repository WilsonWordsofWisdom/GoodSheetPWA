"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { fetchReferenceData, FALLBACK_REFERENCE, type ReferenceData } from "./reference-data";

const ReferenceDataContext = createContext<ReferenceData>(FALLBACK_REFERENCE);

export function ReferenceDataProvider({ children }: { children: React.ReactNode }) {
  // Start with instant offline defaults, then refresh from Supabase.
  const [data, setData] = useState<ReferenceData>(FALLBACK_REFERENCE);

  useEffect(() => {
    let active = true;
    fetchReferenceData().then((d) => { if (active) setData(d); });
    return () => { active = false; };
  }, []);

  return <ReferenceDataContext.Provider value={data}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceData(): ReferenceData {
  return useContext(ReferenceDataContext);
}
