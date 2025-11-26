/**
 * Cuestionario de planificación (5-7 preguntas)
 */

export interface QuestionOption {
  value: string;
  label: string;
  icon: string;
  description?: string;
}

export interface PlanningQuestion {
  id: string;
  question: string;
  type: 'single-choice' | 'multiple-choice' | 'number-input';
  options?: QuestionOption[];
  min?: number;
  max?: number;
  default?: any;
}

export const PLANNING_QUESTIONS: PlanningQuestion[] = [
  {
    id: 'goals',
    question: '¿Cuál es tu objetivo principal?',
    type: 'single-choice',
    options: [
      { value: 'weight_loss', label: 'Perder peso', icon: '⚖️' },
      { value: 'muscle_gain', label: 'Ganar músculo', icon: '💪' },
      { value: 'maintenance', label: 'Mantener salud', icon: '🌱' },
      { value: 'family', label: 'Alimentar familia', icon: '👨‍👩‍👧‍👦' },
    ],
  },
  {
    id: 'dietary',
    question: '¿Tienes restricciones alimentarias?',
    type: 'multiple-choice',
    options: [
      { value: 'none', label: 'Ninguna', icon: '✅' },
      { value: 'vegetarian', label: 'Vegetariano', icon: '🥗' },
      { value: 'vegan', label: 'Vegano', icon: '🌱' },
      { value: 'gluten_free', label: 'Sin gluten', icon: '🚫🌾' },
      { value: 'dairy_free', label: 'Sin lácteos', icon: '🚫🥛' },
    ],
  },
  {
    id: 'people',
    question: '¿Para cuántas personas cocinas?',
    type: 'number-input',
    min: 1,
    max: 10,
    default: 2,
  },
  {
    id: 'skill',
    question: '¿Cuál es tu nivel de experiencia cocinando?',
    type: 'single-choice',
    options: [
      { value: 'beginner', label: 'Principiante', icon: '🌱', description: 'Recetas simples y rápidas' },
      { value: 'intermediate', label: 'Intermedio', icon: '🔥', description: 'Recetas variadas' },
      { value: 'advanced', label: 'Avanzado', icon: '⭐', description: 'Todo tipo de recetas' },
    ],
  },
  {
    id: 'time',
    question: '¿Cuánto tiempo tienes para cocinar cada día?',
    type: 'single-choice',
    options: [
      { value: 'low', label: 'Poco tiempo', icon: '⏱️', description: 'Menos de 30 minutos' },
      { value: 'medium', label: 'Tiempo moderado', icon: '🕐', description: '30-60 minutos' },
      { value: 'high', label: 'Mucho tiempo', icon: '⏰', description: 'Más de 60 minutos' },
    ],
  },
];
