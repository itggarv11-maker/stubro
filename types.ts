import firebase from 'firebase/compat/app';

export type FirebaseUser = firebase.User;

export enum Subject {
  Math = "Math",
  Physics = "Physics",
  Chemistry = "Chemistry",
  Biology = "Biology",
  Science = "Science (General)",
  History = "History",
  Geography = "Geography",
  SST = "Social Studies (SST)",
  English = "English",
  ComputerScience = "Computer Science"
}

export type ClassLevel = 
  | "Class 6" | "Class 7" | "Class 8" | "Class 9" | "Class 10" 
  | "Class 11" | "Class 12" | "Any";

export type QuestionType = 'mcq' | 'written';

export interface QuizQuestion {
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string; // For MCQs
  explanation: string;
  userAnswer?: string; // For storing user's answer
  isCorrect?: boolean;   // For storing if MCQ answer was correct
}

export interface WrittenFeedback {
  whatIsCorrect: string;
  whatIsMissing: string;
  whatIsIncorrect: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface PaperQuestion {
  question: string;
  questionType: 'mcq' | 'short_answer' | 'long_answer';
  options?: string[];
  answer: string;
  marks: number;
}

export interface QuestionPaper {
  title: string;
  totalMarks: number;
  instructions: string;
  questions: PaperQuestion[];
}

export interface GradedQuestion {
    questionNumber: number;
    marksAwarded: number;
    feedback: string;
}

export interface GradedPaper {
    totalMarksAwarded: number;
    overallFeedback: string;
    gradedQuestions: GradedQuestion[];
}