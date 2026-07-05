export interface ProfileInfo {
  full_name: string;
  title?: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  summary: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: string;
  gpa?: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  location: string;
  start_date: string;
  end_date: string;
  description: string[];
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface ResumeData {
  user_id: string;
  profile: ProfileInfo;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillCategory[];
}

export interface AptitudeQuestionPublic {
  id: string;
  category: string;
  question_text: string;
  options: string[];
}

export interface AptitudeQuestion {
  id: string;
  category: string;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

export interface SubmitAnswersRequest {
  answers: Record<string, number>;
}

export interface QuestionResult {
  id: string;
  category: string;
  question_text: string;
  options: string[];
  selected_option: number | null;
  correct_option: number;
  is_correct: boolean;
  explanation: string;
}

export interface SubmitAnswersResponse {
  total_questions: number;
  total_score: number;
  percentage_score: number;
  results: QuestionResult[];
}

export interface TestCase {
  input: string;
  expected: string;
  output?: string;
  passed?: boolean;
}

export interface CodingQuestion {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  constraints: string[];
  test_cases: TestCase[];
  boilerplates: Record<string, string>;
}


