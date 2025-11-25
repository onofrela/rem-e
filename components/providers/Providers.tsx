"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { RecipeGuideProvider } from "@/lib/contexts/RecipeGuideContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RecipeGuideProvider>
        {children}
      </RecipeGuideProvider>
    </ThemeProvider>
  );
}
