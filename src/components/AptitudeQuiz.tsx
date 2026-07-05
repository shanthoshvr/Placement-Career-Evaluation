import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Cpu, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Clock, 
  Brain, 
  MessageSquareQuote 
} from 'lucide-react';
import { AptitudeQuestionPublic, SubmitAnswersResponse } from '../types';

export default function AptitudeQuiz({ onQuizCompleted }: { onQuizCompleted?: (score: number, percentage: number) => void }) {
  const [questions, setQuestions] = useState<AptitudeQuestionPublic[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitResponse, setSubmitResponse] = useState<SubmitAnswersResponse | null>(null);
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch 5 randomized questions from backend
  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<AptitudeQuestionPublic[]>('/api/test/aptitude/start');
      setQuestions(res.data);
      setCurrentIdx(0);
      setUserAnswers({});
      setSubmitted(false);
      setSubmitResponse(null);
    } catch (err: any) {
      console.error("Failed to load aptitude questions:", err);
      setError("Unable to connect to the placement API. Please verify the backend service is running.");
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
    fetchQuestions();
  };

  const handleSelectOption = (qId: string, optionIdx: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  // Submit and fetch detailed grading/explanations from backend
  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length < questions.length) {
      const confirmSubmit = window.confirm("You have not answered all questions. Are you sure you want to submit?");
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await axios.post<SubmitAnswersResponse>('/api/test/aptitude/submit', {
        answers: userAnswers
      });
      setSubmitResponse(res.data);
      setSubmitted(true);
      if (onQuizCompleted) {
        onQuizCompleted(res.data.total_score, res.data.percentage_score);
      }
    } catch (err) {
      console.error("Failed to submit aptitude answers:", err);
      setError("An error occurred while grading your quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    fetchQuestions();
  };

  // Helper colors for question categories
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'aptitude':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case 'verbal':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case 'reasoning':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
    }
  };

  if (!quizStarted) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-3xl mx-auto shadow-xl relative overflow-hidden" id="aptitude-intro-screen">
        <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:20px_20px]" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/15 mb-6">
            <Brain className="h-10 w-10 animate-pulse" />
          </div>

          <h3 className="text-2xl font-bold text-white tracking-tight">Placement Training & Assessment</h3>
          <p className="text-slate-400 max-w-lg mt-2 text-sm">
            Prepare for top hiring bar standards with our core evaluation module. Measure and perfect your skills across three crucial dimensions.
          </p>

          {/* Core modules review */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left">
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">01. Quantitative Aptitude</span>
              <p className="text-slate-400 text-xs mt-1">Arithmetic calculation, profit & loss, train dynamics, and core logical mathematics.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">02. Verbal Competency</span>
              <p className="text-slate-400 text-xs mt-1">Advanced vocabulary opposite antonym pairings and complex semantic reasoning.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">03. Logical Reasoning</span>
              <p className="text-slate-400 text-xs mt-1">Series sequencing division logic, pattern decryption, and complex pedigree family relations.</p>
            </div>
          </div>

          {/* Meta metrics */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-mono mt-8 border-t border-b border-slate-800/80 py-4 w-full">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-slate-400" />
              <span>5 Dynamic Questions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Untimed Learning Focus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <span>Interactive Step Explanations</span>
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="mt-8 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold py-3 px-8 rounded-xl shadow-lg transition duration-200"
            id="start-assessment-btn"
          >
            <span>Start Practice Assessment</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xl" id="aptitude-loading">
        <RefreshCw className="h-8 w-8 text-amber-400 animate-spin mb-4" />
        <h4 className="font-semibold text-white">Fetching Randomized Assessment...</h4>
        <p className="text-xs text-slate-500 mt-1">Retrieving high-quality question pools asynchronously from MongoDB backend.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto text-center shadow-xl" id="aptitude-error">
        <XCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
        <h4 className="font-semibold text-white">Server Connection Error</h4>
        <p className="text-xs text-slate-400 mt-2">{error}</p>
        <button
          onClick={fetchQuestions}
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-white py-2 px-4 rounded border border-slate-700 transition"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Retry Loading Pool</span>
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIdx];
  const isSelected = (idx: number) => userAnswers[currentQ.id] === idx;

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="aptitude-module-wrapper">
      
      {/* Upper Status Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/15">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Adaptive Placement Mock Sandbox</h4>
            <p className="text-xs text-slate-400">Practicing is the key to solving complex logic bars.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!submitted ? (
            <span className="text-xs font-mono text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/15 font-bold uppercase tracking-wider">
              Attempt Progress: {Object.keys(userAnswers).length} / {questions.length} Solved
            </span>
          ) : (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 py-1.5 px-3.5 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Load Next Randomized Pool</span>
            </button>
          )}
        </div>
      </div>

      {!submitted ? (
        /* ACTIVE INTERACTIVE ASSESSMENT SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="active-quiz-view">
          
          {/* Question and options card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
              
              {/* Question card header */}
              <div className="flex justify-between items-center mb-6">
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getCategoryColor(currentQ.category)}`}>
                  {currentQ.category} Section
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">
                  Question {currentIdx + 1} of {questions.length}
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-lg font-medium text-white leading-relaxed mb-8">
                {currentQ.question_text}
              </h3>

              {/* Options */}
              <div className="space-y-3" id={`options-container-q-${currentIdx}`}>
                {currentQ.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(currentQ.id, idx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition flex items-start gap-3.5 group ${
                      isSelected(idx)
                        ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-500/5'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-900/60 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                      isSelected(idx)
                        ? 'border-amber-500 bg-amber-500 text-slate-950'
                        : 'border-slate-800 bg-slate-950 text-slate-400 group-hover:border-slate-600'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed">{option}</span>
                  </button>
                ))}
              </div>

              {/* Interactive Navigation Footers */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800/80">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 py-2 px-4 rounded-lg border border-slate-850 transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 text-xs bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 py-2 px-4 rounded-lg border border-slate-850 transition"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 py-2.5 px-5 rounded-lg shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Grading Payload...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Submit & Verify Answers</span>
                      </>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Right quick list / navigation deck */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">Questions Deck</h4>
              
              <div className="grid grid-cols-5 gap-2" id="questions-deck-navigator">
                {questions.map((q, idx) => {
                  const answered = userAnswers[q.id] !== undefined;
                  const active = idx === currentIdx;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-10 rounded-lg border text-xs font-mono font-bold transition ${
                        active
                          ? 'bg-amber-500 border-amber-500 text-slate-950 shadow'
                          : answered
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span>Currently active question</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500/30 border border-amber-500/20"></span>
                  <span>Completed answer logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-950 border border-slate-850"></span>
                  <span>Not visited yet</span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
              <h5 className="font-bold text-white text-xs flex items-center gap-1.5 mb-2">
                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                Placement Core Wisdom
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Automated ATS systems and top product companies filter candidates by aptitude tests as a key triage step. Understanding the math behind time-speed-distance or profit percentage helps bypass initial vetting bars easily.
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* DETAILED RESULTS & INTEGRATED LEARNING VIEW */
        <div className="space-y-6" id="quiz-results-view">
          
          {/* Main scoreboard banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.01] bg-[size:20px_20px]" />
            
            <div className="z-10 flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                <Award className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">Assessment Evaluation Complete</h3>
                <p className="text-xs text-slate-400 max-w-md mt-0.5">
                  Great work! We've integrated correct formulas and logic steps directly below so you can study your mistakes.
                </p>
              </div>
            </div>

            {/* Rounded gauge score display */}
            <div className="z-10 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 px-6">
              <div className="relative h-14 w-14 flex items-center justify-center font-mono text-xl font-extrabold text-white">
                {/* SVG Circle indicator */}
                <svg className="absolute transform -rotate-90 w-full h-full">
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="#1e293b"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={150.7}
                    strokeDashoffset={150.7 - (150.7 * ((submitResponse?.total_score ?? 0) / (submitResponse?.total_questions ?? 1)))}
                  />
                </svg>
                <span>{submitResponse?.total_score} / {submitResponse?.total_questions}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Grading Metric</span>
                <span className="text-sm font-extrabold text-emerald-400 font-mono">
                  {submitResponse?.percentage_score}% Match
                </span>
              </div>
            </div>
          </div>

          {/* Graded list with explanations */}
          <div className="space-y-5" id="answers-explanation-deck">
            <h3 className="font-bold text-white text-md flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-amber-400" />
              Integrated Solutions & Explanations Corner
            </h3>

            {submitResponse?.results.map((q, idx) => {
              const selectedIdx = q.selected_option;
              const isCorrect = q.is_correct;

              return (
                <div 
                  key={q.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden shadow transition ${
                    isCorrect ? 'border-emerald-500/20' : 'border-rose-500/20'
                  }`}
                >
                  {/* Item header */}
                  <div className="bg-slate-950 px-5 py-4 border-b border-slate-800/60 flex flex-wrap justify-between items-center gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-300">
                        {idx + 1}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryColor(q.category)}`}>
                        {q.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      {isCorrect ? (
                        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Correct Answer (+1)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Incorrect Response (0)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body content */}
                  <div className="p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-200 leading-relaxed">
                      {q.question_text}
                    </h4>

                    {/* Show options with colored feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {q.options.map((option, optIdx) => {
                        const optSelected = selectedIdx === optIdx;
                        const optCorrect = q.correct_option === optIdx;

                        return (
                          <div
                            key={optIdx}
                            className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                              optCorrect
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : optSelected
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                  : 'bg-slate-950/30 border-slate-800/80 text-slate-400'
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                              optCorrect
                                ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                                : optSelected
                                  ? 'border-rose-500 bg-rose-500 text-slate-950'
                                  : 'border-slate-800 bg-slate-950 text-slate-500'
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{option}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Integrated Answers & Explanations Area */}
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4.5 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquareQuote className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                          Solution Logic & Explanation:
                        </span>
                      </div>
                      <p className="text-xs text-amber-300/90 leading-relaxed font-sans">
                        {q.explanation}
                      </p>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons at bottom */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold py-3 px-8 rounded-xl shadow-lg transition duration-200"
            >
              <RefreshCw className="h-4 w-4 animate-spin-slow" />
              <span>Retake Assessment (New Pool)</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
