"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { RecipeGuideProvider } from "@/lib/contexts/RecipeGuideContext";
import { RecipeSettingsProvider } from "@/contexts/RecipeSettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <RecipeSettingsProvider>
        <RecipeGuideProvider>
          {children}
        </RecipeGuideProvider>
      </RecipeSettingsProvider>
    </ThemeProvider>
  );
}
