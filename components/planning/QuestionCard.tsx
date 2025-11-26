'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PlanningQuestion } from '@/lib/constants/planningQuestions';

interface QuestionCardProps {
  question: PlanningQuestion;
  answer: any;
  onAnswer: (value: any) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  answer,
  onAnswer,
}) => {
  if (question.type === 'number-input') {
    return (
      <Card variant="elevated" padding="lg" className="w-full animate-scaleIn">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
          {question.question}
        </h2>

        <div className="flex flex-col items-center gap-6">
          <input
            type="number"
            min={question.min}
            max={question.max}
            value={answer || question.default || 1}
            onChange={(e) => onAnswer(parseInt(e.target.value))}
            className="text-6xl md:text-7xl font-bold text-center w-32 border-2 border-primary rounded-xl p-4 focus:outline-none focus:ring-4 focus:ring-primary/30"
          />

          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onAnswer(Math.max(question.min || 1, (answer || question.default || 1) - 1))}
            >
              −
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onAnswer(Math.min(question.max || 10, (answer || question.default || 1) + 1))}
            >
              +
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (question.type === 'multiple-choice') {
    const selectedValues = answer || [];

    return (
      <Card variant="elevated" padding="lg" className="w-full animate-scaleIn">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
          {question.question}
        </h2>
        <p className="text-base text-gray-600 mb-6 text-center">
          Puedes seleccionar varias opciones
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.options?.map((option) => {
            const isSelected = selectedValues.includes(option.value);

            return (
              <button
                key={option.value}
                onClick={() => {
                  const newValues = isSelected
                    ? selectedValues.filter((v: string) => v !== option.value)
                    : [...selectedValues, option.value];
                  onAnswer(newValues);
                }}
                className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 hover:border-primary/50'
                }`}
              >
                <span className="text-5xl block mb-3">{option.icon}</span>
                <h3 className="text-xl font-semibold mb-1">{option.label}</h3>
                {option.description && (
                  <p className="text-sm text-gray-600">{option.description}</p>
                )}
              </button>
            );
          })}
        </div>
      </Card>
    );
  }

  // single-choice
  return (
    <Card variant="elevated" padding="lg" className="w-full animate-scaleIn">
      <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        {question.question}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options?.map((option) => {
          const isSelected = answer === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onAnswer(option.value)}
              className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300 hover:border-primary/50'
              }`}
            >
              <span className="text-5xl block mb-3">{option.icon}</span>
              <h3 className="text-xl font-semibold mb-1">{option.label}</h3>
              {option.description && (
                <p className="text-sm text-gray-600">{option.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
