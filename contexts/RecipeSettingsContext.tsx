'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface RecipeSettings {
  askForRating: boolean;
}

interface RecipeSettingsContextType {
  settings: RecipeSettings;
  updateSettings: (updates: Partial<RecipeSettings>) => void;
}

const DEFAULT_SETTINGS: RecipeSettings = {
  askForRating: true,
};

const RecipeSettingsContext = createContext<RecipeSettingsContextType | undefined>(undefined);

export const RecipeSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<RecipeSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Load settings from localStorage on mount
    const savedSettings = localStorage.getItem('recipe-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Error parsing recipe settings:', error);
      }
    }
  }, []);

  const updateSettings = (updates: Partial<RecipeSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      localStorage.setItem('recipe-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  return (
    <RecipeSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </RecipeSettingsContext.Provider>
  );
};

export const useRecipeSettings = () => {
  const context = useContext(RecipeSettingsContext);
  if (context === undefined) {
    throw new Error('useRecipeSettings must be used within a RecipeSettingsProvider');
  }
  return context;
};
