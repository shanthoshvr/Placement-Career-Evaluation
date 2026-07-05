import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import {
  Brain,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Code2,
  Clock,
  User,
  Heart,
  FileText,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Lightbulb
} from 'lucide-react';

interface FeedbackItem {
  question: string;
  answer: string;
  grade: string;
  strengths: string;
  weaknesses: string;
  ideal_answer: string;
}

interface InterviewReportCard {
  overall_score: number;
  technical_rating: number;
  communication_rating: number;
  subject_relevance_rating: number;
  detailed_feedback: FeedbackItem[];
  overall_summary: string;
  improvement_plan: string[];
}

interface AssessmentHistoryResponse {
  user_id: string;
  aptitude_score: number | null;
  aptitude_total: number;
  coding_score: number | null;
  coding_total: number;
  interview_status: 'not_started' | 'ongoing' | 'completed';
  interview_report: InterviewReportCard | null;
}

export default function AIInterviewPortal({ userId = 'candidate123', onResetAll }: { userId?: string, onResetAll?: () => void }) {
  // Assessment History States
  const [history, setHistory] = useState<AssessmentHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Active Interview Session States
  const [interviewStarted, setInterviewStarted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [userTypedResponse, setUserTypedResponse] = useState<string>('');
  const [submittingResponse, setSubmittingResponse] = useState<boolean>(false);
  const [interviewComplete, setInterviewComplete] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'interview'>('dashboard');

  // Timeline expanded states (tracks index of expanded questions)
  const [expandedIndex, setExpandedIndex] = useState<Record<number, boolean>>({ 0: true });

  // Fetch assessment history on mount
  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await axios.get<AssessmentHistoryResponse>(`/api/assessment/history/${userId}`);
      setHistory(res.data);
      
      // Sync local UI tab based on interview progress
      if (res.data.interview_status === 'completed') {
        setInterviewComplete(true);
        setInterviewStarted(false);
      } else if (res.data.interview_status === 'ongoing') {
        setInterviewStarted(true);
        // Fetch current active question
        fetchActiveQuestion();
      }
    } catch (err: any) {
      console.error('Error fetching assessment history:', err);
      setHistoryError('Could not load your student placement metrics. Ensure backend server is running.');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  // Fetch active question for ongoing interview
  const fetchActiveQuestion = async () => {
    try {
      const statusRes = await axios.get(`/api/interview/status/${userId}`);
      if (statusRes.data && statusRes.data.status === 'ongoing') {
        const questionsList = statusRes.data.questions || [];
        const answersList = statusRes.data.answers || [];
        const nextIdx = answersList.length;
        
        setCurrentQuestionIdx(nextIdx);
        if (nextIdx < questionsList.length) {
          setCurrentQuestion(questionsList[nextIdx]);
        } else {
          // No more questions, but not finalized? Finalize it.
          setInterviewStarted(false);
          setInterviewComplete(true);
          fetchHistory();
        }
      }
    } catch (e) {
      console.error('Error getting active question:', e);
    }
  };

  // Start fresh AI interview
  const handleStartInterview = async () => {
    setSubmittingResponse(true);
    try {
      const res = await axios.post(`/api/interview/start/${userId}`);
      if (res.data && res.data.question) {
        setCurrentQuestion(res.data.question);
        setCurrentQuestionIdx(0);
        setInterviewStarted(true);
        setInterviewComplete(false);
        setUserTypedResponse('');
        setActiveTab('interview');
        
        // Refresh history status
        fetchHistory();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start AI interview. Please verify your Resume details are saved.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Submit interview response
  const handleSubmitResponse = async () => {
    if (!userTypedResponse.trim()) {
      alert('Please type a response before submitting.');
      return;
    }

    setSubmittingResponse(true);
    try {
      const res = await axios.post('/api/interview/respond', {
        user_id: userId,
        current_question: currentQuestion,
        response_text: userTypedResponse
      });

      setUserTypedResponse('');

      if (res.data.status === 'completed') {
        setInterviewStarted(false);
        setInterviewComplete(true);
        setActiveTab('dashboard');
        await fetchHistory(); // Pull report card!
      } else {
        setCurrentQuestionIdx(res.data.current_question_index);
        setCurrentQuestion(res.data.question);
      }
    } catch (err: any) {
      console.error('Error submitting response:', err);
      alert('An error occurred while analyzing your response. Please try again.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Reset interview state to start fresh
  const handleResetInterviewOnly = async () => {
    if (!window.confirm('Are you sure you want to delete your current AI interview progress and start a fresh session?')) {
      return;
    }
    try {
      await axios.post(`/api/interview/reset/${userId}`);
      setInterviewStarted(false);
      setInterviewComplete(false);
      setCurrentQuestion('');
      setCurrentQuestionIdx(0);
      setUserTypedResponse('');
      fetchHistory();
    } catch (e) {
      console.error('Error resetting interview:', e);
    }
  };

  // Toggle timeline details
  const toggleExpand = (idx: number) => {
    setExpandedIndex(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Pre-fill metrics mock values if they have not done Phase 2/3 yet for display
  const handlePreFillScores = async () => {
    try {
      await axios.post(`/api/assessment/save/${userId}`, {
        aptitude_score: 4,
        aptitude_total: 5,
        coding_score: 2,
        coding_total: 3
      });
      fetchHistory();
    } catch (e) {
      console.error('Error pre-filling scores:', e);
    }
  };

  if (loadingHistory) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-slate-400 font-mono text-xs">Retrieving student performance metrics...</p>
      </div>
    );
  }

  // Determine scores
  const appAptitudeScore = history?.aptitude_score !== null && history?.aptitude_score !== undefined
    ? history.aptitude_score
    : (localStorage.getItem('aptitude_score') ? parseInt(localStorage.getItem('aptitude_score')!, 10) : null);

  const appCodingScore = history?.coding_score !== null && history?.coding_score !== undefined
    ? history.coding_score
    : (localStorage.getItem(`passed_coding_problems_${userId}`) ? JSON.parse(localStorage.getItem(`passed_coding_problems_${userId}`)!).length : null);

  const reportCard = history?.interview_report;

  return (
    <div className="space-y-8" id="ai-interview-portal-wrapper">
      
      {/* Top Welcome Title Grid */}
      <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              Phase 4 Learning Portal
            </span>
            {interviewComplete && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Report Finalized
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Comprehensive Placement Report
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Review detailed metrics across the quantitative aptitude tests, technical coding test suites, and generative AI mock interviews with exact expert answers.
          </p>
        </div>

        {/* Tab Controls / Launch Interview Action */}
        <div className="flex flex-wrap items-center gap-3">
          {reportCard && (
            <button
              onClick={() => setActiveTab(prev => prev === 'dashboard' ? 'interview' : 'dashboard')}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-850 transition"
            >
              {activeTab === 'dashboard' ? 'View Dialogue Workspace' : 'View Performance Card'}
            </button>
          )}

          {!interviewStarted && !interviewComplete ? (
            <button
              onClick={handleStartInterview}
              disabled={submittingResponse}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/15 transition disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Launch Interview Assessment</span>
            </button>
          ) : interviewStarted ? (
            <button
              onClick={() => setActiveTab('interview')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-500 text-white font-bold text-xs rounded-xl hover:bg-indigo-600 transition"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Resume Active Interview</span>
            </button>
          ) : (
            <button
              onClick={handleStartInterview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Re-run Interview</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Switch Area */}
      {activeTab === 'interview' && interviewStarted ? (
        
        /* INTERVIEW SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="active-interview-canvas">
          
          {/* Left panel: Info & Progress Bar */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-purple-400" />
              Session Status
            </h4>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5 text-xs font-mono">
                  <span className="text-slate-400">Interview Progress</span>
                  <span className="text-purple-400 font-bold">{currentQuestionIdx + 1} of 5</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="space-y-2.5 pt-2">
                {[1, 2, 3, 4, 5].map(stepNum => {
                  const isActive = stepNum === currentQuestionIdx + 1;
                  const isCompleted = stepNum < currentQuestionIdx + 1;
                  return (
                    <div key={stepNum} className="flex items-center gap-3 text-xs font-mono">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] font-bold shrink-0 ${
                        isCompleted 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : isActive 
                            ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 animate-pulse' 
                            : 'bg-slate-950 border-slate-850 text-slate-600'
                      }`}>
                        {isCompleted ? <Check className="h-3 w-3" /> : stepNum}
                      </div>
                      <span className={isCompleted ? 'text-slate-500 line-through' : isActive ? 'text-slate-200 font-bold' : 'text-slate-600'}>
                        {stepNum === 1 && 'Academic Curriculum Alignment'}
                        {stepNum === 2 && 'Resume Project Deep-Dive'}
                        {stepNum === 3 && 'System Design & Scalability'}
                        {stepNum === 4 && 'Framework & Tech Stack Proficiency'}
                        {stepNum === 5 && 'HR Principles & Cultural Alignment'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>The AI interviewer is evaluating your <strong>communication clarity</strong>, <strong>technical accuracy</strong>, and structured logical formatting.</span>
              </p>
              <p className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Provide thorough responses. You can write code snippets or structured explanations inside the answer box.</span>
              </p>
            </div>

            <button
              onClick={handleResetInterviewOnly}
              className="w-full py-2 bg-slate-950 hover:bg-slate-850 text-slate-500 hover:text-slate-300 text-xs font-bold rounded-lg border border-slate-850 transition"
            >
              Reset Session
            </button>
          </div>

          {/* Right panel: Active Chat dialogue Workspace */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              
              {/* Interview Workspace Header */}
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-850 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-slate-300">Active Technical Interview Workspace</span>
                </div>
                <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-500/20">
                  Model: Gemini Flash
                </span>
              </div>

              {/* Dialogue Box */}
              <div className="p-6 md:p-8 space-y-6">
                
                {/* AI Question Statement */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 border border-slate-850 rounded-2xl p-6 relative"
                >
                  <div className="absolute -top-3 left-6 px-3 py-0.5 bg-purple-600 text-white text-[9px] font-mono font-bold uppercase rounded-full">
                    AI Interviewer
                  </div>
                  <MessageSquare className="absolute right-6 top-6 h-5 w-5 text-slate-700" />
                  
                  <div className="space-y-3 font-sans">
                    <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed italic">
                      "{currentQuestion}"
                    </p>
                  </div>
                </motion.div>

                {/* Response Entry Box */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                    <span>Type your structured technical response below:</span>
                    <span>{userTypedResponse.length} chars</span>
                  </div>

                  <textarea
                    value={userTypedResponse}
                    onChange={(e) => setUserTypedResponse(e.target.value)}
                    disabled={submittingResponse}
                    placeholder="Enter your detailed response here. Explain your design process, time/space complexity analysis, or standard engineering logic..."
                    className="w-full h-48 bg-slate-950 border border-slate-850 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-sans leading-relaxed disabled:opacity-50"
                  />

                  {/* Submission row */}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-500">
                      Response gets logged durably to MongoDB.
                    </span>

                    <button
                      onClick={handleSubmitResponse}
                      disabled={submittingResponse || !userTypedResponse.trim()}
                      className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-40"
                    >
                      {submittingResponse ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>AI Analyzing Response...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit & Next Question</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

      ) : (

        /* PERFORMANCE DASHBOARD & METRICS CARD GRID */
        <div className="space-y-8" id="assessment-dashboard-canvas">
          
          {/* If no metrics completed, offer pre-fill or bypass */}
          {appAptitudeScore === null && appCodingScore === null && !reportCard && (
            <div className="bg-indigo-500/10 border border-indigo-500/15 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <h5 className="text-white font-bold text-sm">Dashboard Setup Suggestion</h5>
                  <p className="text-xs text-slate-400">
                    To populate this dashboard with representative metrics and see the timelines instantly, you can complete Phase 2/3, or pre-fill representative test results.
                  </p>
                </div>
              </div>
              <button
                onClick={handlePreFillScores}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition whitespace-nowrap"
              >
                Pre-Fill Dummy Scores
              </button>
            </div>
          )}

          {/* Bento Grid Metrics Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="dashboard-bento-grid">
            
            {/* Card 1: Aptitude Assessment Result (ColSpan 4) */}
            <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-64">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white tracking-tight mt-1">Quantitative Aptitude</h4>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>

              {appAptitudeScore !== null ? (
                <div className="my-2 flex items-center gap-4">
                  {/* Big Circular percentage */}
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {appAptitudeScore}/5
                    <span className="text-xs text-slate-400 font-normal block mt-1">
                      {((appAptitudeScore / 5) * 100).toFixed(0)}% accuracy score
                    </span>
                  </div>
                  {/* Styled indicator ring */}
                  <div className="flex-1 bg-slate-950 h-3 rounded-full border border-slate-850 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${appAptitudeScore >= 3 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${(appAptitudeScore / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="my-2 text-slate-500 text-xs italic font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  No aptitude results logged yet.
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  appAptitudeScore !== null && appAptitudeScore >= 3
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-slate-950 text-slate-500 border-slate-850'
                }`}>
                  {appAptitudeScore !== null && appAptitudeScore >= 3 ? 'Passing Grade' : 'Awaiting Grade'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Passing Threshold: 60%</span>
              </div>
            </div>

            {/* Card 2: Coding Assessment Result (ColSpan 4) */}
            <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-64">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white tracking-tight mt-1">Technical Coding Round</h4>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                  <Code2 className="h-4 w-4" />
                </div>
              </div>

              {appCodingScore !== null ? (
                <div className="my-2 flex items-center gap-4">
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {appCodingScore}/3
                    <span className="text-xs text-slate-400 font-normal block mt-1">
                      LeetCode problems solved
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-950 h-3 rounded-full border border-slate-850 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(appCodingScore / 3) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="my-2 text-slate-500 text-xs italic font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  No coding solutions logged.
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  appCodingScore !== null && appCodingScore > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-950 text-slate-500 border-slate-850'
                }`}>
                  {appCodingScore !== null && appCodingScore > 0 ? 'Verified Solutions' : 'Sandbox Idle'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Virtual Compiler Sandbox</span>
              </div>
            </div>

            {/* Card 3: AI Interview Score Rating (ColSpan 4) */}
            <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden h-64">
              <div className="absolute top-0 right-0 h-24 w-24 bg-purple-500/5 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white tracking-tight mt-1">Interview Critique</h4>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                  <Award className="h-4 w-4" />
                </div>
              </div>

              {reportCard ? (
                <div className="my-2 flex items-center justify-between">
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {reportCard.overall_score}
                    <span className="text-slate-400 text-2xl font-light">/100</span>
                    <span className="text-xs text-slate-400 font-normal block mt-1">
                      Aggregated AI quality index
                    </span>
                  </div>
                  {/* Minimal Sub ratings badge */}
                  <div className="space-y-1 text-[10px] font-mono text-slate-400 text-right">
                    <div>Tech Depth: <span className="text-purple-400 font-bold">{reportCard.technical_rating * 10}/10</span></div>
                    <div>Clarities: <span className="text-indigo-400 font-bold">{reportCard.communication_rating * 10}/10</span></div>
                    <div>Relevance: <span className="text-blue-400 font-bold">{reportCard.subject_relevance_rating * 10}/10</span></div>
                  </div>
                </div>
              ) : (
                <div className="my-2 text-slate-500 text-xs italic font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  Interview has not been finalized yet.
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                  reportCard
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-slate-950 text-slate-500 border-slate-850'
                }`}>
                  {reportCard ? 'Assessment Done' : 'Awaiting Session'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Gemini Generative Evaluator</span>
              </div>
            </div>

          </div>

          {/* Interactive Timeline Breakdown Section */}
          {reportCard ? (
            <div className="space-y-6" id="learning-timeline-section">
              
              <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Interactive Training Timeline</h3>
                    <p className="text-xs text-slate-400">Detailed question-by-question response grading and custom errors detected.</p>
                  </div>
                </div>
                
                <button
                  onClick={handleResetInterviewOnly}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-850 text-slate-400 hover:text-rose-400 hover:border-rose-500/20 rounded-lg text-xs font-mono transition"
                >
                  Clear & Restart Interview
                </button>
              </div>

              {/* List of Timeline rounds */}
              <div className="relative border-l-2 border-slate-800 pl-6 md:pl-8 ml-3 space-y-12">
                {reportCard.detailed_feedback.map((item, idx) => {
                  const isExpanded = expandedIndex[idx] || false;
                  return (
                    <div key={idx} className="relative group">
                      
                      {/* Round Node badge */}
                      <span className="absolute -left-12 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 border-2 border-indigo-500 font-mono text-xs font-bold text-indigo-400 shadow shadow-slate-950">
                        {idx + 1}
                      </span>

                      {/* Header block */}
                      <div 
                        onClick={() => toggleExpand(idx)}
                        className="bg-slate-950 border border-slate-900 rounded-2xl p-5 cursor-pointer hover:border-slate-850 transition"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
                                Round {idx + 1} Assessment
                              </span>
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Grade: {item.grade || 'A'}
                              </span>
                            </div>
                            <h4 className="text-sm md:text-base font-bold text-slate-200 group-hover:text-white transition leading-snug">
                              Q: "{item.question}"
                            </h4>
                          </div>

                          <div className="p-1.5 bg-slate-900 rounded-lg text-slate-500">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>

                        {/* Expandable critique block */}
                        {isExpanded && (
                          <div className="mt-6 pt-6 border-t border-slate-900 space-y-6 animate-fade-in font-sans">
                            
                            {/* User response speech bubble */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                                <User className="h-3.5 w-3.5" />
                                <span>Candidate Response:</span>
                              </div>
                              <div className="bg-slate-900 rounded-xl p-4 border border-slate-850 text-slate-300 text-xs md:text-sm whitespace-pre-wrap leading-relaxed">
                                {item.answer}
                              </div>
                            </div>

                            {/* Strengths & Weaknesses detected in Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* Strengths card */}
                              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>Candidate Strengths:</span>
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                  {item.strengths || 'Accurate demonstration of key technical primitives, concise code syntax, and clear execution reasoning.'}
                                </p>
                              </div>

                              {/* Weaknesses / custom errors card */}
                              <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
                                  <AlertCircle className="h-4 w-4 shrink-0" />
                                  <span>Critique / Optimization Errors Detected:</span>
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed">
                                  {item.weaknesses || 'Minor design gaps. Could offer deeper performance trade-offs under high-throughput data pipelines.'}
                                </p>
                              </div>

                            </div>

                            {/* Ideal Expert answer box */}
                            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-l-4 border-indigo-500 rounded-r-xl p-5 space-y-3">
                              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-400">
                                <Sparkles className="h-4 w-4" />
                                <span>Ideal Expert Answer for Training:</span>
                              </div>
                              <div className="bg-slate-950/70 border border-indigo-500/10 rounded-xl p-4 font-mono text-[11px] md:text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
                                {item.ideal_answer}
                              </div>
                            </div>

                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Overall Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden mt-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Comprehensive AI Improvement Program</h4>
                    <p className="text-xs text-slate-400 font-mono">Prescribed learning path based on aggregated interview weaknesses</p>
                  </div>
                </div>

                <div className="space-y-4 font-sans text-sm text-slate-300 leading-relaxed">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-850">
                    <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-2 text-indigo-400">Overall Evaluator Summary:</h5>
                    <p className="text-xs md:text-sm">{reportCard.overall_summary}</p>
                  </div>

                  {reportCard.improvement_plan && reportCard.improvement_plan.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">Targeted Actions & Study Milestones:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reportCard.improvement_plan.map((planItem, idx) => (
                          <div key={idx} className="flex gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs items-start">
                            <span className="h-5 w-5 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                              {idx + 1}
                            </span>
                            <span>{planItem}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs text-slate-500 font-mono">
                  <span>Authorized evaluation generated dynamically.</span>
                  <span>System: google-genai 3.5-flash</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-md max-w-2xl mx-auto my-12">
              <Brain className="h-12 w-12 text-slate-600 mx-auto" />
              <div className="space-y-2">
                <h4 className="text-white font-bold text-base">Interview Critique Pending</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  To unlock the interactive learning timeline and receive ideal expert answers compiled by Gemini, launch and complete the active interview assessment.
                </p>
              </div>
              <button
                onClick={handleStartInterview}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-lg transition"
              >
                Launch Interview Assessment Session
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
