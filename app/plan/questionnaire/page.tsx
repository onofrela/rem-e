'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionnaireFlow } from '@/components/planning';
import { generatePlanFromQuestionnaire } from '@/lib/db/services/planningAlgorithmService';
import { createMealPlan } from '@/lib/db/services/mealPlanService';
import type { QuestionnaireAnswers } from '@/lib/db/schemas/types';

export default function QuestionnairePage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const handleComplete = async (answers: QuestionnaireAnswers) => {
    console.log('🚀 Starting plan generation with answers:', answers);
    setGenerating(true);
    try {
      console.log('📝 Generating plan from questionnaire...');
      const plan = await generatePlanFromQuestionnaire(answers);
      console.log('✅ Plan generated:', plan);

      console.log('💾 Saving plan to database...');
      const savedPlan = await createMealPlan(plan);
      console.log('✅ Plan saved:', savedPlan);

      console.log('🔄 Redirecting to /plan...');
      router.push('/plan');
    } catch (error) {
      console.error('❌ Error generating plan:', error);
      alert(`Error al generar el plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setGenerating(false);
    }
  };

  const handleCancel = () => {
    router.push('/plan');
  };

  if (generating) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-8xl mb-4">⏳</div>
          <h2 className="text-3xl font-bold">Generando tu plan...</h2>
          <p className="text-lg text-gray-600 mt-2">Esto tomará unos segundos</p>
        </div>
      </div>
    );
  }

  return <QuestionnaireFlow onComplete={handleComplete} onCancel={handleCancel} />;
}
