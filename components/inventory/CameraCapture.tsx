/* IMPORTANT: Light theme only - do not use dark mode */
'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

/**
 * Camera capture component using file input with camera access
 * More compatible approach than getUserMedia API
 */
export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setSelectedFile(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onCapture(selectedFile);
    }
  };

  const handleOpenCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Camera preview or captured image */}
      {!capturedImage ? (
        <>
          <Card variant="elevated" padding="lg" className="mb-6 text-center">
            <span className="text-8xl mb-6 block">📷</span>
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              Tomar Foto del Ingrediente
            </h3>
            <p className="text-base text-[var(--color-text-secondary)] mb-6">
              Asegúrate de que el ingrediente esté bien iluminado y en foco
            </p>
          </Card>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="xl"
              fullWidth
              onClick={handleOpenCamera}
              icon={<span>📸</span>}
              iconPosition="left"
            >
              Abrir Cámara
            </Button>
            <Button variant="ghost" size="lg" fullWidth onClick={onCancel}>
              Cancelar
            </Button>
          </div>

          {/* Instructions */}
          <Card variant="outlined" padding="md" className="mt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  <strong>Consejo:</strong> Para mejores resultados, toma la foto con buena
                  iluminación y asegúrate de que el ingrediente ocupe la mayor parte de la imagen.
                </p>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Image preview */}
          <Card variant="elevated" padding="none" className="mb-6 overflow-hidden">
            <div className="relative bg-black aspect-[4/3] md:aspect-video">
              <img
                src={capturedImage}
                alt="Captura"
                className="w-full h-full object-contain"
              />
            </div>
          </Card>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="xl"
              fullWidth
              onClick={handleConfirm}
              icon={<span>✓</span>}
              iconPosition="left"
            >
              Usar esta Foto
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={handleRetake}
              icon={<span>🔄</span>}
              iconPosition="left"
            >
              Tomar otra Foto
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={onCancel}>
              Cancelar
            </Button>
          </div>

          {/* Preview info */}
          <Card variant="outlined" padding="md" className="mt-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Revisa que la imagen sea clara antes de continuar. El sistema analizará la foto
                  para detectar el ingrediente automáticamente.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
