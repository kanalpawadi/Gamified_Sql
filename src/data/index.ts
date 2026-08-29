import { basicQuestions } from './questions/basic';
import { intermediateQuestions } from './questions/intermediate';
import { advancedQuestions } from './questions/advanced';
export type { Question } from './questions/basic';

export const allQuestions = [
  ...basicQuestions,
  ...intermediateQuestions,
  ...advancedQuestions
];

export { basicQuestions, intermediateQuestions, advancedQuestions };
