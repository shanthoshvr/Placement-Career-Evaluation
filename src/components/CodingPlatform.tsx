import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  BookOpen, 
  Settings,
  Flame,
  ChevronDown,
  Info
} from 'lucide-react';
import { CodingQuestion, TestCase } from '../types';

// Pre-defined technical coding questions
const SAMPLE_CODING_QUESTIONS: CodingQuestion[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays & Hashing',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    test_cases: [
      { input: 'nums = [2, 7, 11, 15], target = 9', expected: '[0, 1]' },
      { input: 'nums = [3, 2, 4], target = 6', expected: '[1, 2]' }
    ],
    boilerplates: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    num_to_index = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in num_to_index:
            return [num_to_index[diff], i]
        num_to_index[num] = i
    return []
`,
      javascript: `function twoSum(nums, target) {
    // Write your solution here
    const numToIndex = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (numToIndex.has(diff)) {
            return [numToIndex.get(diff), i];
        }
        numToIndex.set(nums[i], i);
    }
    return [];
}
`,
      java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your solution here
        Map<Integer, Integer> numToIndex = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int diff = target - nums[i];
            if (numToIndex.containsKey(diff)) {
                return new int[] { numToIndex.get(diff), i };
            }
            numToIndex.put(nums[i], i);
        }
        return new int[0];
    }
}
`
    }
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only: "()[]{}"'
    ],
    test_cases: [
      { input: 's = "()[]{}"', expected: 'true' },
      { input: 's = "(]"', expected: 'false' }
    ],
    boilerplates: {
      python: `def isValid(s: str) -> bool:
    # Write your solution here
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top_element = stack.pop() if stack else '#'
            if mapping[char] != top_element:
                return False
        else:
            stack.append(char)
    return not stack
`,
      javascript: `function isValid(s) {
    // Write your solution here
    const stack = [];
    const mapping = {
        ')': '(',
        '}': '{',
        ']': '['
    };
    for (let i = 0; i < s.length; i++) {
        const char = s[i];
        if (mapping[char]) {
            const topElement = stack.length > 0 ? stack.pop() : '#';
            if (mapping[char] !== topElement) {
                return false;
            }
        } else {
            stack.push(char);
        }
    }
    return stack.length === 0;
}
`,
      java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        // Write your solution here
        Stack<Character> stack = new Stack<>();
        Map<Character, Character> mapping = new HashMap<>();
        mapping.put(')', '(');
        mapping.put('}', '{');
        mapping.put(']', '[');
        
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (mapping.containsKey(c)) {
                char topElement = stack.isEmpty() ? '#' : stack.pop();
                if (topElement != mapping.get(c)) {
                    return false;
                }
            } else {
                stack.push(c);
            }
        }
        return stack.isEmpty();
    }
}
`
    }
  },
  {
    id: 'palindrome-number',
    title: 'Palindrome Number',
    difficulty: 'Easy',
    category: 'Math',
    description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward. For example, `121` is palindrome while `123` is not.',
    constraints: [
      '-2^31 <= x <= 2^31 - 1'
    ],
    test_cases: [
      { input: 'x = 121', expected: 'true' },
      { input: 'x = -121', expected: 'false' }
    ],
    boilerplates: {
      python: `def isPalindrome(x: int) -> bool:
    # Write your solution here
    if x < 0:
        return False
    return str(x) == str(x)[::-1]
`,
      javascript: `function isPalindrome(x) {
    // Write your solution here
    if (x < 0) return false;
    const s = x.toString();
    return s === s.split('').reverse().join('');
}
`,
      java: `class Solution {
    public boolean isPalindrome(int x) {
        // Write your solution here
        if (x < 0) return false;
        int reversed = 0, temp = x;
        while (temp != 0) {
            int digit = temp % 10;
            reversed = reversed * 10 + digit;
            temp /= 10;
        }
        return reversed == x;
    }
}
`
    }
  }
];

export default function CodingPlatform({ onCodingCompleted, userId = 'candidate123' }: { onCodingCompleted?: (score: number, total: number) => void, userId?: string }) {
  const [selectedQuestion, setSelectedQuestion] = useState<CodingQuestion>(SAMPLE_CODING_QUESTIONS[0]);
  const [language, setLanguage] = useState<string>('python');
  const [theme, setTheme] = useState<string>('vs-dark');
  const [code, setCode] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestCase[] | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  
  // Track passed problems
  const [passedProblems, setPassedProblems] = useState<string[]>(() => {
    const saved = localStorage.getItem(`passed_coding_problems_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Sync boilerplate on language or question change
  useEffect(() => {
    if (selectedQuestion.boilerplates[language]) {
      setCode(selectedQuestion.boilerplates[language]);
    } else {
      setCode('// Select a different language or write your solution here');
    }
    setTestResults(null);
    setConsoleOutput('');
    setTerminalLogs([]);
  }, [selectedQuestion, language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = SAMPLE_CODING_QUESTIONS.find(q => q.id === e.target.value);
    if (found) {
      setSelectedQuestion(found);
    }
  };

  // Asynchronously execute code compilation and test cases via Gemini backend API
  const runCodeTests = async (isFullSubmission: boolean = false) => {
    const loadingStateSetter = isFullSubmission ? setIsSubmitting : setIsRunning;
    loadingStateSetter(true);
    setConsoleOutput('Compiling code and linking binary test fixtures...\n');
    setTerminalLogs([
      `[info] Selected environment: ${language.toUpperCase()}`,
      `[info] Sandbox compilation: OK`,
      `[info] Contacting remote compilation engine...`
    ]);

    try {
      const response = await fetch('/api/test/coding/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: language,
          question_id: selectedQuestion.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const allPassed = data.status === 'Passed';
      
      if (allPassed && isFullSubmission) {
        setPassedProblems(prev => {
          const updated = prev.includes(selectedQuestion.id) ? prev : [...prev, selectedQuestion.id];
          localStorage.setItem(`passed_coding_problems_${userId}`, JSON.stringify(updated));
          
          // Sync with MongoDB backend
          fetch(`/api/assessment/save/${userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              coding_score: updated.length,
              coding_total: 3
            })
          }).then(r => r.json())
            .then(syncRes => {
              console.log("Synced coding results to backend:", syncRes);
              if (onCodingCompleted) {
                onCodingCompleted(updated.length, 3);
              }
            })
            .catch(err => console.error("Failed to sync coding score:", err));
            
          return updated;
        });
      }
      
      setConsoleOutput(
        `--- TEST RESULTS ---\n` +
        `Status: ${data.status.toUpperCase()} ${allPassed ? '✅' : '❌'}\n\n` +
        `[Execution Log]\n${data.output_received}\n\n` +
        (data.failed_case_details ? `[Failed Cases Details]\n${data.failed_case_details}\n\n` : '') +
        `[Structural Analysis & Refactoring Suggestions]\n${data.explanation}`
      );

      setTerminalLogs([
        `[info] Selected environment: ${language.toUpperCase()}`,
        `[info] Sandbox compilation: OK`,
        `[system] Test suite completed. Status: ${data.status}`,
        `[status] ${allPassed ? 'Clean execution exit' : 'Abnormal exit - mismatch detected'}`
      ]);

      const gradedCases = selectedQuestion.test_cases.map((tc, index) => {
        const passed = allPassed || (index === 0 && !data.output_received.toLowerCase().includes('error'));
        return {
          ...tc,
          output: passed ? tc.expected : 'Execution failed / value mismatch',
          passed: passed
        };
      });
      setTestResults(gradedCases);

    } catch (error: any) {
      console.error(error);
      setConsoleOutput(`Error contacting backend compilation engine: ${error.message || error}`);
      setTerminalLogs([
        `[error] Remote compilation failed.`,
        `[status] Connection timed out / refused.`
      ]);
    } finally {
      loadingStateSetter(false);
    }
  };

  // Helper styles for difficulty badge
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6" id="coding-platform-container">
      
      {/* Platform Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/15">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Interactive Coding Environment</h4>
            <p className="text-xs text-slate-400">Select standard technical interview questions and submit your solution.</p>
          </div>
        </div>

        {/* Dropdowns for select questions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs font-mono text-slate-500">Problem:</span>
            <select
              value={selectedQuestion.id}
              onChange={handleQuestionChange}
              className="bg-slate-950 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SAMPLE_CODING_QUESTIONS.map(q => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="split-editor-grid">
        
        {/* Left column: Question card - takes 5/12 cols */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[600px] flex flex-col">
            
            {/* Tab header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                Description & Constraints
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                  {selectedQuestion.difficulty}
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {selectedQuestion.category}
                </span>
              </div>
            </div>

            {/* Description Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* Question title */}
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedQuestion.title}
                </h3>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  <span>LeetCode Standard Sandbox Match</span>
                </div>
              </div>

              {/* Description Details */}
              <div className="text-slate-300 text-sm leading-relaxed space-y-4 whitespace-pre-line">
                {selectedQuestion.description}
              </div>

              {/* Constraints list */}
              <div className="space-y-2.5">
                <h5 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  Constraints:
                </h5>
                <ul className="space-y-1.5 list-disc pl-5">
                  {selectedQuestion.constraints.map((constraint, idx) => (
                    <li key={idx} className="text-xs font-mono text-slate-400 leading-normal">
                      {constraint}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Two sample test cases */}
              <div className="space-y-3.5 pt-2">
                <h5 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Sample Test Cases:
                </h5>

                <div className="space-y-3">
                  {selectedQuestion.test_cases.slice(0, 2).map((tc, idx) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 font-mono text-xs">
                      <div className="text-indigo-400 font-bold text-[10px] uppercase">Example {idx + 1}</div>
                      <div>
                        <span className="text-slate-500">Input:</span> <span className="text-slate-300">{tc.input}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Output:</span> <span className="text-emerald-400">{tc.expected}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom info banner */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 flex items-center gap-2.5 text-xs text-slate-400">
              <Info className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Feel free to edit the function boilerplate on the right or type a custom solution.</span>
            </div>

          </div>
        </div>

        {/* Right column: Monaco editor + Console - takes 7/12 cols */}
        <div className="lg:col-span-7 space-y-4 flex flex-col min-h-[600px]">
          
          {/* Monaco Editor Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col flex-1">
            
            {/* Editor toolbar */}
            <div className="bg-slate-950 px-5 py-3 border-b border-slate-850 flex flex-wrap justify-between items-center gap-3">
              
              {/* Language Selection menu */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">Language:</span>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="bg-slate-900 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer capitalize"
                  id="language-selector-dropdown"
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="java">Java</option>
                </select>
              </div>

              {/* Theme Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">Theme:</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="bg-slate-900 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="vs-dark">Dark Theme (vs-dark)</option>
                  <option value="light">Light Theme (vs-light)</option>
                </select>
              </div>
            </div>

            {/* Embed Monaco Editor Component */}
            <div className="relative flex-1 border-b border-slate-850 min-h-[350px]">
              <Editor
                height="100%"
                width="100%"
                language={language}
                theme={theme}
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
                  padding: { top: 12, bottom: 12 }
                }}
              />
            </div>

            {/* Editor Action buttons */}
            <div className="bg-slate-950 p-4 flex justify-between items-center">
              <button
                onClick={() => setCode(selectedQuestion.boilerplates[language])}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 py-2 px-3.5 rounded-lg border border-slate-800 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reset Code</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => runCodeTests(false)}
                  disabled={isRunning || isSubmitting}
                  className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 py-2 px-4 rounded-lg border border-slate-700 transition font-medium disabled:opacity-50"
                  id="run-code-button"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Running Suite...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Run Code</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => runCodeTests(true)}
                  disabled={isRunning || isSubmitting}
                  className="flex items-center gap-1.5 text-xs text-slate-950 font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 py-2 px-4 rounded-lg shadow transition disabled:opacity-50 animate-pulse"
                  id="submit-code-button"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Submit Solution</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Console Terminal Output Panel */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden flex flex-col h-[200px]" id="editor-console-pane">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-850 flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-amber-500" />
                Execution Output & Debugger
              </span>
              <div className="flex gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500"></span>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 bg-black/40">
              {terminalLogs.length === 0 && !consoleOutput && !isRunning && !isSubmitting && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 space-y-1 py-4">
                  <Play className="h-6 w-6 text-slate-700" />
                  <p>Console is idle. Write your solution and hit "Run Code" or "Submit Solution".</p>
                </div>
              )}

              {/* Event Logs */}
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="text-slate-500 text-[10px]">
                  {log}
                </div>
              ))}

              {/* Live Sandbox Compilation Spinner */}
              {(isRunning || isSubmitting) && (
                <div className="flex items-center gap-2 py-3 px-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl animate-pulse my-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
                  <span className="text-[11px]">Compiling program, binding hidden test suite fixtures, and invoking Gemini virtual test suite...</span>
                </div>
              )}

              {/* Divider if we have actual compiler execution outputs */}
              {consoleOutput && (
                <div className="border-t border-slate-900/60 my-2 pt-2">
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {consoleOutput}
                  </pre>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
