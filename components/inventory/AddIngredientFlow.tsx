/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useState } from 'react';
import { FullScreenOverlay } from '@/components/ui/FullScreenOverlay';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CameraCapture } from './CameraCapture';
import { IngredientMatcher } from './IngredientMatcher';
import { IngredientSearch } from './IngredientSearch';
import { IngredientConfirmation } from './IngredientConfirmation';
import { recognizeFoodFromFile } from '@/lib/vision/foodRecognition';
import type { CatalogIngredient, Location } from '@/lib/db/schemas/types';
import type { RecognitionResult } from '@/lib/vision/foodRecognition';

type FlowStep =
  | 'selection' // Choose camera or manual
  | 'camera' // Taking photo
  | 'analyzing' // Analyzing photo
  | 'matching' // Show matches
  | 'search' // Manual search
  | 'confirmation'; // Confirm and add

interface AddIngredientFlowProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: CatalogIngredient[];
  locations: Location[];
  onAdd: (data: {
    ingredientId: string;
    quantity: number;
    unit: string;
    location: string;
    expirationDate?: string;
  }) => void;
}

/**
 * Main orchestrator for the add ingredient flow
 * Handles camera detection and manual search flows
 */
export function AddIngredientFlow({
  isOpen,
  onClose,
  ingredients,
  locations,
  onAdd,
}: AddIngredientFlowProps) {
  const [step, setStep] = useState<FlowStep>('selection');
  const [selectedIngredient, setSelectedIngredient] = useState<CatalogIngredient | null>(null);
  const [detectionResult, setDetectionResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset flow when closed
  const handleClose = () => {
    setStep('selection');
    setSelectedIngredient(null);
    setDetectionResult(null);
    setError(null);
    onClose();
  };

  // Handle camera flow
  const handleCameraChoice = () => {
    setStep('camera');
  };

  const handleManualChoice = () => {
    setStep('search');
  };

  // Handle photo capture
  const handlePhotoCapture = async (file: File) => {
    setStep('analyzing');
    setError(null);

    try {
      const results = await recognizeFoodFromFile(file);

      if (!results || results.length === 0) {
        setError('No se pudo detectar ningún ingrediente en la imagen.');
        setStep('selection');
        return;
      }

      // Get the first (most confident) result
      const mainResult = results[0];
      setDetectionResult(mainResult);

      // Try to find matching ingredient in catalog
      const exactMatch = findIngredientMatch(mainResult.foodNameEs || mainResult.foodName);

      if (exactMatch) {
        // Direct match found, go to confirmation
        setSelectedIngredient(exactMatch);
        setStep('confirmation');
      } else {
        // No exact match, show matcher
        setStep('matching');
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      setError('Error al analizar la imagen. Por favor, intenta de nuevo.');
      setStep('selection');
    }
  };

  // Find ingredient by name/synonym
  const findIngredientMatch = (name: string): CatalogIngredient | null => {
    const searchTerm = name.toLowerCase().trim();

    // Try exact match on name
    const exactNameMatch = ingredients.find(
      (ing) => ing.name.toLowerCase() === searchTerm ||
      ing.normalizedName.toLowerCase() === searchTerm
    );
    if (exactNameMatch) return exactNameMatch;

    // Try exact match on synonyms
    const synonymMatch = ingredients.find((ing) =>
      ing.synonyms.some((syn) => syn.toLowerCase() === searchTerm)
    );
    if (synonymMatch) return synonymMatch;

    // Try partial match (contains)
    const partialMatch = ingredients.find((ing) =>
      ing.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(ing.name.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  };

  // Handle ingredient selection from matcher or search
  const handleIngredientSelect = (ingredient: CatalogIngredient) => {
    setSelectedIngredient(ingredient);
    setStep('confirmation');
  };

  // Handle search manually from matcher
  const handleSearchManually = () => {
    setStep('search');
  };

  // Handle change ingredient from confirmation
  const handleChangeIngredient = () => {
    setSelectedIngredient(null);
    setStep('search');
  };

  // Handle final confirmation
  const handleConfirm = async (data: {
    ingredientId: string;
    quantity: number;
    unit: string;
    location: string;
    expirationDate?: string;
  }) => {
    await onAdd(data);
    handleClose();
  };

  const getStepTitle = (): string => {
    switch (step) {
      case 'selection':
        return 'Agregar Ingrediente';
      case 'camera':
        return 'Tomar Foto';
      case 'analyzing':
        return 'Analizando...';
      case 'matching':
        return 'Seleccionar Ingrediente';
      case 'search':
        return 'Buscar Ingrediente';
      case 'confirmation':
        return 'Confirmar Detalles';
      default:
        return 'Agregar Ingrediente';
    }
  };

  return (
    <FullScreenOverlay isOpen={isOpen} onClose={handleClose} title={getStepTitle()}>
      {/* Step: Selection (camera or manual) */}
      {step === 'selection' && (
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="text-center mb-8">
            <span className="text-6xl mb-4 block">📦</span>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              ¿Cómo deseas agregar el ingrediente?
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Elige una opción para comenzar
            </p>
          </div>

          {error && (
            <Card
              variant="outlined"
              padding="md"
              className="mb-6 border-red-300 bg-red-50 text-center"
            >
              <p className="text-red-600 text-sm">{error}</p>
            </Card>
          )}

          <div className="space-y-4">
            <Card
              variant="elevated"
              padding="lg"
              hoverable
              className="cursor-pointer"
              onClick={handleCameraChoice}
            >
              <div className="text-center">
                <span className="text-7xl mb-4 block">📷</span>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  Detectar con Cámara
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Toma una foto y detecta automáticamente el ingrediente
                </p>
              </div>
            </Card>

            <Card
              variant="elevated"
              padding="lg"
              hoverable
              className="cursor-pointer"
              onClick={handleManualChoice}
            >
              <div className="text-center">
                <span className="text-7xl mb-4 block">✏️</span>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  Agregar Manualmente
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Busca y selecciona el ingrediente del glosario
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step: Camera */}
      {step === 'camera' && (
        <CameraCapture onCapture={handlePhotoCapture} onCancel={() => setStep('selection')} />
      )}

      {/* Step: Analyzing */}
      {step === 'analyzing' && (
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Card variant="outlined" padding="lg" className="text-center">
            <div className="animate-pulse">
              <span className="text-6xl mb-4 block">🔍</span>
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
                Analizando Imagen
              </h3>
              <p className="text-[var(--color-text-secondary)]">
                Detectando ingredientes, esto puede tomar unos segundos...
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Step: Matching */}
      {step === 'matching' && detectionResult && (
        <IngredientMatcher
          detectedName={detectionResult.foodNameEs || detectionResult.foodName}
          detectedCategory={detectionResult.category}
          confidence={detectionResult.confidence * 100}
          ingredients={ingredients}
          onSelect={handleIngredientSelect}
          onSearchManually={handleSearchManually}
        />
      )}

      {/* Step: Search */}
      {step === 'search' && (
        <IngredientSearch ingredients={ingredients} onSelect={handleIngredientSelect} />
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && selectedIngredient && (
        <IngredientConfirmation
          selectedIngredient={selectedIngredient}
          initialQuantity={detectionResult?.estimatedWeight?.weight}
          initialUnit={detectionResult?.estimatedWeight?.unit}
          locations={locations}
          onChangeIngredient={handleChangeIngredient}
          onConfirm={handleConfirm}
          onCancel={handleClose}
        />
      )}
    </FullScreenOverlay>
  );
}
