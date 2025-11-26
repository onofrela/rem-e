'use client';

import React, { useState } from 'react';
import { Card } from './Card';
import { Button } from './Button';

interface RatingModalProps {
  isOpen: boolean;
  recipeName: string;
  onClose: () => void;
  onSkip: () => void;
  onSubmit: (rating: number, notes?: string) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  recipeName,
  onClose,
  onSkip,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, notes.trim() || undefined);
      // Reset state
      setRating(0);
      setNotes('');
    }
  };

  const handleSkip = () => {
    onSkip();
    // Reset state
    setRating(0);
    setNotes('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <Card variant="elevated" padding="lg">
          <div className="text-center">
            <span className="text-6xl">👨‍🍳</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-4 mb-2">
              ¡Receta Completada!
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-6">
              ¿Cómo te quedó <strong>{recipeName}</strong>?
            </p>

            {/* Rating Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="text-5xl transition-transform hover:scale-110 focus:outline-none focus:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} estrellas`}
                >
                  {(hoveredRating || rating) >= star ? '⭐' : '☆'}
                </button>
              ))}
            </div>

            {/* Notes textarea */}
            <div className="mb-6">
              <label
                htmlFor="rating-notes"
                className="block text-left text-sm font-semibold text-gray-700 mb-2"
              >
                Comentarios (opcional)
              </label>
              <textarea
                id="rating-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Algo que quieras recordar sobre esta receta?"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 text-right mt-1">
                {notes.length}/500
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="ghost"
                size="lg"
                fullWidth
                onClick={handleSkip}
              >
                Omitir
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={rating === 0}
              >
                Guardar Calificación
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
