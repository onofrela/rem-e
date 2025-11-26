'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { PLANNING_QUESTIONS } from '@/lib/constants/planningQuestions';
import type { QuestionnaireAnswers } from '@/lib/db/schemas/types';

interface QuestionnaireFlowProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onCancel: () => void;
}

export const QuestionnaireFlow: React.FC<QuestionnaireFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const currentQuestion = PLANNING_QUESTIONS[currentStep];
  const isLastQuestion = currentStep === PLANNING_QUESTIONS.length - 1;
  const canProceed = answers[currentQuestion.id] != null;

  const handleAnswer = (value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Convert answers to QuestionnaireAnswers format
      const formattedAnswers: QuestionnaireAnswers = {
        goals: Array.isArray(answers.goals) ? answers.goals : [answers.goals],
        dietaryRestrictions: Array.isArray(answers.dietary)
          ? answers.dietary.filter((v: string) => v !== 'none')
          : [],
        peopleCount: answers.people || 2,
        skillLevel: answers.skill || 'intermediate',
        timeAvailable: answers.time || 'medium',
      };
      onComplete(formattedAnswers);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[var(--color-background-gradient-start)] via-[var(--color-background-gradient-middle)] to-[var(--color-background-gradient-end)] overflow-y-auto">
      <div className="min-h-screen flex flex-col p-6">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          <ProgressBar
            current={currentStep + 1}
            total={PLANNING_QUESTIONS.length}
          />

          <div className="flex-1 flex items-center justify-center mb-6">
            <QuestionCard
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onAnswer={handleAnswer}
            />
          </div>

          <div className="flex gap-4">
            {currentStep > 0 && (
              <Button variant="ghost" size="lg" onClick={handleBack}>
                ← Atrás
              </Button>
            )}
            <Button variant="ghost" size="lg" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!canProceed}
              className="ml-auto"
            >
              {isLastQuestion ? 'Generar Plan' : 'Siguiente →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
