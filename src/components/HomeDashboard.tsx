import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'motion/react';
import { 
  Brain, 
  Code2, 
  Award, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  TrendingUp, 
  Timer, 
  Compass,
  Briefcase,
  Layers,
  Activity,
  ChevronRight
} from 'lucide-react';

interface CategoryScore {
  score: number | null;
  total: number;
  percentage: number;
  test_cases_passed?: number | null;
  test_cases_total?: number;
}

interface DashboardData {
  user_name: string;
  global_placement_average: number;
  aptitude: CategoryScore;
  quantitative: CategoryScore;
  reasoning: CategoryScore;
  verbal: CategoryScore;
  coding: CategoryScore;
  interview: CategoryScore;
  language_analyzed: string | null;
  communication_rating: number | null;
  technical_rating: number | null;
  next_active_phase: 'resume' | 'aptitude' | 'coding' | 'portal';
}

interface HomeDashboardProps {
  onNavigateTab: (tab: 'home' | 'resume' | 'aptitude' | 'coding' | 'portal') => void;
}

export default function HomeDashboard({ onNavigateTab }: HomeDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<DashboardData>('/api/user/dashboard-summary');
        setData(res.data);
      } catch (err: any) {
        console.error("Failed to load dashboard metrics:", err);
        setError("Could not retrieve your placement performance history. Please check if your session is valid.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, []);

  const getProgressBarColor = (percentage: number, isNotAttempted: boolean) => {
    if (isNotAttempted) return 'bg-slate-800';
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getPercentageColorClass = (percentage: number, isNotAttempted: boolean) => {
    if (isNotAttempted) return 'text-slate-500';
    if (percentage >= 75) return 'text-emerald-400';
    if (percentage >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getStatusBadge = (percentage: number, isNotAttempted: boolean) => {
    if (isNotAttempted) {
      return (
        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono font-medium">
          NOT ATTEMPTED
        </span>
      );
    }
    if (percentage >= 75) {
      return (
        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium">
          PASSED (READY)
        </span>
      );
    }
    if (percentage >= 50) {
      return (
        <span className="text-[10px] bg-amber-500/10 border border-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-mono font-medium">
          NEEDS PRACTICE
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-rose-500/10 border border-rose-500/15 text-rose-400 px-2 py-0.5 rounded-full font-mono font-medium">
        CRITICAL ACTION
      </span>
    );
  };

  // Human friendly title translations for next phases
  const getPhaseName = (phase: string) => {
    switch (phase) {
      case 'resume': return 'ATS Resume Builder';
      case 'aptitude': return 'Aptitude Assessment';
      case 'coding': return 'Technical Coding Round';
      case 'portal': return 'Interview Assessment';
      default: return 'Evaluation Pipeline';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4" id="dashboard-loading-view">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">Aggregating placement readiness metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 max-w-xl mx-auto text-center" id="dashboard-error-view">
        <Activity className="h-12 w-12 text-rose-500 mx-auto mb-4 opacity-80" />
        <h3 className="text-white text-lg font-bold mb-2">Metrics Fetch Exception</h3>
        <p className="text-slate-400 text-sm mb-6">{error || "Something went wrong while synchronizing placement state."}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/10"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isAptitudeNotAttempted = data.aptitude.score === null;
  const isCodingNotAttempted = data.coding.score === null;
  const isInterviewNotAttempted = data.interview.score === null;

  const totalObtained = (data.aptitude.score || 0) + (data.coding.score || 0) + (data.interview.score || 0);
  const totalPossible = (data.aptitude.total || 5) + (data.coding.total || 3) + 100;

  // Circular progress math
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.global_placement_average / 100) * circumference;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in" id="pace-home-dashboard">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-slate-900/40 to-slate-950 border border-slate-850 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">{data.user_name}</span>!
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl font-medium">
            Your career simulation portal is active. Complete the standardized pipeline phases below to build your credential card, sandbox score, and clear the AI mock board.
          </p>
        </div>
      </div>

      {/* Main Stats Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-indigo-400" />
            Global Placement Average
          </h3>
          <p className="text-slate-300 text-sm max-w-xl">
            Your comprehensive aggregate preparation status calculated across standardized technical mock interviews, system compilations, and logical-numerical assessments.
          </p>
          <div className="w-full sm:w-72 bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-2 mt-4">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1"><Cpu className="h-3.5 w-3.5 text-indigo-400" /> Status:</span>
              <span className="font-bold text-white">
                {data.global_placement_average >= 75 ? "Excellent (Elite Tier)" : data.global_placement_average >= 50 ? "Qualified (Silver Tier)" : "Action Required"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1"><Award className="h-3.5 w-3.5 text-indigo-400" /> Total Score:</span>
              <span className="font-bold text-white">
                {totalObtained} / {totalPossible}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Circular Gauge */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-36 h-36 transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-slate-800"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              className="stroke-indigo-500"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: strokeDashoffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-white">{data.global_placement_average}%</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Aggregate</span>
          </div>
        </div>
      </div>

      {/* Specific Performance Matrices Score Matrix */}
      <div className="space-y-4">
        <h3 className="text-white text-base font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-400" />
          Placement Performance Category Score Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Quantitative Aptitude */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md hover:border-slate-850 transition">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white text-sm font-bold mt-2">Quantitative Aptitude</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">Core math</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Evaluation Score</span>
                <span className={`font-mono font-bold ${getPercentageColorClass(data.quantitative.percentage, isAptitudeNotAttempted)}`}>
                  {isAptitudeNotAttempted ? "N/A" : `${data.quantitative.score} / ${data.quantitative.total} (${data.quantitative.percentage}%)`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(data.quantitative.percentage, isAptitudeNotAttempted)}`}
                  style={{ width: `${isAptitudeNotAttempted ? 0 : data.quantitative.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Logical Reasoning */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md hover:border-slate-850 transition">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white text-sm font-bold mt-2">Logical Reasoning</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">Structured logic</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Evaluation Score</span>
                <span className={`font-mono font-bold ${getPercentageColorClass(data.reasoning.percentage, isAptitudeNotAttempted)}`}>
                  {isAptitudeNotAttempted ? "N/A" : `${data.reasoning.score} / ${data.reasoning.total} (${data.reasoning.percentage}%)`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(data.reasoning.percentage, isAptitudeNotAttempted)}`}
                  style={{ width: `${isAptitudeNotAttempted ? 0 : data.reasoning.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Verbal Ability */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md hover:border-slate-850 transition">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white text-sm font-bold mt-2">Verbal Ability</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">Grammar & vocabulary</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Evaluation Score</span>
                <span className={`font-mono font-bold ${getPercentageColorClass(data.verbal.percentage, isAptitudeNotAttempted)}`}>
                  {isAptitudeNotAttempted ? "N/A" : `${data.verbal.score} / ${data.verbal.total} (${data.verbal.percentage}%)`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(data.verbal.percentage, isAptitudeNotAttempted)}`}
                  style={{ width: `${isAptitudeNotAttempted ? 0 : data.verbal.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Technical Coding Round */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md hover:border-slate-850 transition">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white text-sm font-bold mt-2">Technical Coding</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">{data.language_analyzed || "Compiler state"}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Test Cases Passed</span>
                <span className={`font-mono font-bold ${getPercentageColorClass(data.coding.percentage, isCodingNotAttempted)}`}>
                  {isCodingNotAttempted ? "N/A" : `${data.coding.test_cases_passed} / ${data.coding.test_cases_total} (${data.coding.percentage.toFixed(0)}%)`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(data.coding.percentage, isCodingNotAttempted)}`}
                  style={{ width: `${isCodingNotAttempted ? 0 : data.coding.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Interview Assessment Card */}
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-md hover:border-slate-850 transition">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-white text-sm font-bold mt-2">Interview Assessment</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">Behavioral & Tech</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Communications & Tech Clarity</span>
                <span className={`font-mono font-bold ${getPercentageColorClass(data.interview.percentage, isInterviewNotAttempted)}`}>
                  {isInterviewNotAttempted ? "N/A" : `${data.interview.score}% / 100`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(data.interview.percentage, isInterviewNotAttempted)}`}
                  style={{ width: `${isInterviewNotAttempted ? 0 : data.interview.percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Extra details (Ratings) */}
            {!isInterviewNotAttempted && (
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-850/60 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Comm:</span>
                  <span className="text-indigo-400 font-bold">{data.communication_rating}/10</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Technical:</span>
                  <span className="text-indigo-400 font-bold">{data.technical_rating}/10</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
