import React, { useState } from 'react';
import axios from 'axios';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  Download, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Sparkles, 
  RefreshCw, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { ResumeData, ProfileInfo, EducationEntry, ExperienceEntry, SkillCategory } from '../types';

interface ResumeBuilderProps {
  onSavedSuccessfully?: (message: string) => void;
  userId?: string;
}

export default function ResumeBuilder({ onSavedSuccessfully, userId: propUserId }: ResumeBuilderProps) {
  // Current active step (0: Profile, 1: Education, 2: Experience, 3: Skills, 4: Review & Generate)
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  // Resume state variables
  const [userId, setUserId] = useState<string>(propUserId || 'candidate123');
  const [profile, setProfile] = useState<ProfileInfo>({
    full_name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    summary: ''
  });

  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [skills, setSkills] = useState<SkillCategory[]>([]);

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // API statuses
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<{ status: 'success' | 'error' | 'idle'; message: string }>({
    status: 'idle',
    message: ''
  });

  const steps = [
    { label: 'Profile Header', icon: User, description: 'Personal contact info' },
    { label: 'Education', icon: GraduationCap, description: 'Academic history' },
    { label: 'Internships & Projects', icon: Briefcase, description: 'Fresher, Intern & Project Roles' },
    { label: 'Technical Skills', icon: Wrench, description: 'Tools & expertise' },
    { label: 'Review & Build', icon: FileText, description: 'Generate ATS PDF' }
  ];

  // Helper to load high quality resume template
  const handlePreFill = () => {
    setUserId('candidate123');
    setProfile({
      full_name: 'Alex Mercer',
      title: 'Junior Full-Stack Developer',
      email: 'alex.mercer@example.com',
      phone: '+1 (555) 019-2831',
      location: 'San Francisco, CA',
      website: 'https://alexmercer.dev',
      linkedin: 'https://linkedin.com/in/alexmercer',
      summary: 'Motivated software engineering fresher and proactive developer with hands-on experience in full-stack web development. Proficient in TypeScript, React, Node.js, and modern databases. Proven ability through competitive internship roles and high-impact personal projects.'
    });
    setEducation([
      {
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        field_of_study: 'Computer Science',
        graduation_year: '2026',
        gpa: '3.9/4.0'
      }
    ]);
    setExperience([
      {
        company: 'Google AI Studio (Internship)',
        role: 'Software Engineering Intern',
        location: 'Mountain View, CA (Remote)',
        start_date: 'Jan 2026',
        end_date: 'Present',
        description: [
          'Developed interactive full-stack modules and custom dashboard components using React and Tailwind CSS.',
          'Integrated REST APIs with backend Node.js engines and optimized database queries to improve latency by 15%.',
          'Collaborated with senior software architects in daily standups, sprint planning, and thorough pull request code reviews.'
        ]
      },
      {
        company: 'Smart Evaluation Platform (Personal Project)',
        role: 'Lead Creator / Developer',
        location: 'GitHub / Vercel',
        start_date: 'Sep 2025',
        end_date: 'Dec 2025',
        description: [
          'Designed and built an end-to-end adaptive evaluation platform using React Hooks and state containers.',
          'Implemented secure local session persistence and fluid data visualizations with Recharts to monitor exam scores.',
          'Configured automated continuous deployment workflows from GitHub to Vercel with lint validations.'
        ]
      }
    ]);
    setSkills([
      {
        category: 'Backend & Cloud',
        skills: ['Python', 'FastAPI', 'Go', 'Docker', 'Kubernetes', 'AWS', 'gRPC']
      },
      {
        category: 'Frontend Technologies',
        skills: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Next.js', 'Redux']
      },
      {
        category: 'Databases & Storage',
        skills: ['MongoDB', 'PostgreSQL', 'Redis', 'Elasticsearch', 'Cassandra']
      }
    ]);
    setValidationErrors({});
    setApiResponse({ status: 'idle', message: '' });
  };

  // Validation logic
  const validateStep = (stepIndex: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (stepIndex === 0) {
      if (!profile.full_name.trim()) errors.full_name = 'Full name is required.';
      if (!profile.email.trim()) {
        errors.email = 'Email address is required.';
      } else if (!/\S+@\S+\.\S+/.test(profile.email)) {
        errors.email = 'Enter a valid email address.';
      }
      if (!profile.phone.trim()) errors.phone = 'Phone number is required.';
      if (!profile.location.trim()) errors.location = 'Location is required.';
      if (!profile.summary.trim()) {
        errors.summary = 'Professional summary is required (ATS key section).';
      } else if (profile.summary.trim().length < 50) {
        errors.summary = 'Summary should be detailed (at least 50 characters).';
      }
    }
    
    if (stepIndex === 1) {
      education.forEach((edu, idx) => {
        if (!edu.institution.trim()) errors[`edu_${idx}_institution`] = 'School name is required.';
        if (!edu.degree.trim()) errors[`edu_${idx}_degree`] = 'Degree is required.';
        if (!edu.field_of_study.trim()) errors[`edu_${idx}_field_of_study`] = 'Field of study is required.';
        if (!edu.graduation_year.trim()) errors[`edu_${idx}_graduation_year`] = 'Graduation year is required.';
      });
    }

    if (stepIndex === 2) {
      experience.forEach((exp, idx) => {
        if (!exp.company.trim()) errors[`exp_${idx}_company`] = 'Company is required.';
        if (!exp.role.trim()) errors[`exp_${idx}_role`] = 'Role title is required.';
        if (!exp.location.trim()) errors[`exp_${idx}_location`] = 'Location is required.';
        if (!exp.start_date.trim()) errors[`exp_${idx}_start_date`] = 'Start date is required.';
        if (!exp.end_date.trim()) errors[`exp_${idx}_end_date`] = 'End date is required.';
        if (!exp.description || exp.description.filter(b => b.trim() !== '').length === 0) {
          errors[`exp_${idx}_description`] = 'At least one bullet achievement is required.';
        }
      });
    }

    if (stepIndex === 3) {
      skills.forEach((sk, idx) => {
        if (!sk.category.trim()) errors[`sk_${idx}_category`] = 'Skill category is required.';
        if (!sk.skills || sk.skills.length === 0) {
          errors[`sk_${idx}_skills`] = 'Add at least one skill keyword.';
        }
      });
    }

    if (stepIndex === 4) {
      if (!userId.trim()) errors.user_id = 'User ID is required to save resume.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Axios-powered form submission to DB
  const handleSaveToDatabase = async () => {
    if (!validateStep(4)) return;

    setIsSaving(true);
    setApiResponse({ status: 'idle', message: '' });

    const payload: ResumeData = {
      user_id: userId,
      profile,
      education,
      experience,
      skills
    };

    try {
      const response = await axios.post('/api/resume/save', payload);
      setApiResponse({
        status: 'success',
        message: response.data.message || 'Resume saved successfully!'
      });
      if (onSavedSuccessfully) {
        onSavedSuccessfully(response.data.message || 'Saved draft successfully.');
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || 'Network error encountered during save.';
      setApiResponse({
        status: 'error',
        message: errMsg
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Axios-powered PDF stream fetch and client download triggering
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // Stream the compiled ReportLab PDF
      const response = await axios.get(`/api/resume/download/${userId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `resume_${userId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error("Failed to download PDF stream:", err);
      alert("Failed to stream compiled PDF. Check backend logs.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Profile Form Fields Handlers
  const handleProfileChange = (field: keyof ProfileInfo, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Education Helpers
  const addEducation = () => {
    setEducation(prev => [
      ...prev,
      { institution: '', degree: '', field_of_study: '', graduation_year: '', gpa: '' }
    ]);
  };

  const removeEducation = (index: number) => {
    setEducation(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateEducationField = (index: number, field: keyof EducationEntry, value: string) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  };

  // Experience Helpers
  const addExperience = () => {
    setExperience(prev => [
      ...prev,
      { company: '', role: '', location: '', start_date: '', end_date: '', description: [''] }
    ]);
  };

  const removeExperience = (index: number) => {
    setExperience(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateExperienceField = (index: number, field: keyof ExperienceEntry, value: any) => {
    const updated = [...experience];
    updated[index] = { ...updated[index], [field]: value };
    setExperience(updated);
  };

  const addExperienceBullet = (expIndex: number) => {
    const updated = [...experience];
    updated[expIndex].description.push('');
    setExperience(updated);
  };

  const removeExperienceBullet = (expIndex: number, bulletIndex: number) => {
    const updated = [...experience];
    updated[expIndex].description = updated[expIndex].description.filter((_, idx) => idx !== bulletIndex);
    setExperience(updated);
  };

  const updateExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
    const updated = [...experience];
    updated[expIndex].description[bulletIndex] = value;
    setExperience(updated);
  };

  // Skills Helpers
  const addSkillsCategory = () => {
    setSkills(prev => [
      ...prev,
      { category: '', skills: [] }
    ]);
  };

  const removeSkillsCategory = (index: number) => {
    setSkills(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateSkillsCategoryName = (index: number, name: string) => {
    const updated = [...skills];
    updated[index].category = name;
    setSkills(updated);
  };

  const updateSkillsKeywords = (index: number, rawInput: string) => {
    const updated = [...skills];
    updated[index].skills = rawInput.split(',').map(s => s.trim()).filter(s => s !== '');
    setSkills(updated);
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Header with Pre-fill Button */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Interactive Resume Form</h3>
            <p className="text-[11px] text-slate-500 font-mono">Fill sections and download an ATS-compliant PDF</p>
          </div>
        </div>

        <button
          onClick={handlePreFill}
          className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-900/40 text-amber-400 hover:text-amber-300 py-1.5 px-3.5 rounded-lg border border-amber-500/20 text-xs font-semibold transition cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Autofill Sample Draft</span>
        </button>
      </div>

      {/* Progress Wizard Header */}
      <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80">
        {/* Dynamic Progress Bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-5">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Step Items Grid */}
        <div className="grid grid-cols-5 gap-2">
          {steps.map((st, idx) => {
            const IconComponent = st.icon;
            const isCompleted = currentStep > idx;
            const isActive = currentStep === idx;
            
            return (
              <div 
                key={idx} 
                onClick={() => {
                  // Allow jumping to steps we already completed or validated
                  if (idx <= currentStep || validateStep(currentStep)) {
                    setCurrentStep(idx);
                  }
                }}
                className={`flex flex-col items-center text-center cursor-pointer group transition`}
              >
                <div className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15 scale-105' 
                    : isCompleted 
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 group-hover:border-slate-700 group-hover:text-slate-300'
                }`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className={`text-[10px] mt-2 font-medium hidden sm:block truncate max-w-full ${
                  isActive ? 'text-white font-semibold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Body */}
      <div className="p-6 flex-1 min-h-[350px]">
        {/* STEP 0: PROFILE */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h4 className="text-white text-sm font-semibold flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-4">
              <User className="h-4 w-4 text-indigo-400" />
              Candidate Profile Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => handleProfileChange('full_name', e.target.value)}
                  className={`w-full bg-slate-950 border rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 ${validationErrors.full_name ? 'border-rose-500/60 bg-rose-950/5' : 'border-slate-800'}`}
                  placeholder="Alex Mercer"
                />
                {validationErrors.full_name && (
                  <p className="text-rose-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Professional Title</label>
                <input
                  type="text"
                  value={profile.title}
                  onChange={(e) => handleProfileChange('title', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                  className={`w-full bg-slate-950 border rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 ${validationErrors.email ? 'border-rose-500/60 bg-rose-950/5' : 'border-slate-800'}`}
                  placeholder="alex.mercer@example.com"
                />
                {validationErrors.email && (
                  <p className="text-rose-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  className={`w-full bg-slate-950 border rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 ${validationErrors.phone ? 'border-rose-500/60 bg-rose-950/5' : 'border-slate-800'}`}
                  placeholder="+1-555-0199"
                />
                {validationErrors.phone && (
                  <p className="text-rose-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Location (City, State) *</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleProfileChange('location', e.target.value)}
                  className={`w-full bg-slate-950 border rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 ${validationErrors.location ? 'border-rose-500/60 bg-rose-950/5' : 'border-slate-800'}`}
                  placeholder="San Francisco, CA"
                />
                {validationErrors.location && (
                  <p className="text-rose-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors.location}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Personal Website / Portfolio</label>
                <input
                  type="text"
                  value={profile.website}
                  onChange={(e) => handleProfileChange('website', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://alexmercer.dev"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={profile.linkedin}
                  onChange={(e) => handleProfileChange('linkedin', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="https://linkedin.com/in/alexmercer"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Professional Summary * (Key for ATS keywords)</label>
                <textarea
                  rows={4}
                  value={profile.summary}
                  onChange={(e) => handleProfileChange('summary', e.target.value)}
                  className={`w-full bg-slate-950 border rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed ${validationErrors.summary ? 'border-rose-500/60 bg-rose-950/5' : 'border-slate-800'}`}
                  placeholder="Write a highly competitive summary detailing your industry tenure, core tech stacks, and quantified successes..."
                />
                {validationErrors.summary && (
                  <p className="text-rose-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors.summary}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: EDUCATION */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
              <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-cyan-400" />
                Education History
              </h4>
              <button
                type="button"
                onClick={addEducation}
                className="flex items-center gap-1 bg-indigo-950 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add School</span>
              </button>
            </div>

            {education.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <GraduationCap className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-xs">No educational records added yet.</p>
                <p className="text-slate-600 text-[11px] mt-1">Add a university, college, or bootcamp degree.</p>
                <button
                  type="button"
                  onClick={addEducation}
                  className="mt-3 inline-flex items-center gap-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs py-1.5 px-3 rounded-lg border border-slate-700 font-semibold cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add First Record
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {education.map((edu, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-4 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => removeEducation(idx)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove education"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">University / Institution *</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducationField(idx, 'institution', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`edu_${idx}_institution`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. UC Berkeley"
                        />
                        {validationErrors[`edu_${idx}_institution`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`edu_${idx}_institution`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Degree *</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducationField(idx, 'degree', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`edu_${idx}_degree`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Master of Science"
                        />
                        {validationErrors[`edu_${idx}_degree`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`edu_${idx}_degree`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Field of Study / Major *</label>
                        <input
                          type="text"
                          value={edu.field_of_study}
                          onChange={(e) => updateEducationField(idx, 'field_of_study', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`edu_${idx}_field_of_study`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Computer Science"
                        />
                        {validationErrors[`edu_${idx}_field_of_study`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`edu_${idx}_field_of_study`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Graduation Year *</label>
                        <input
                          type="text"
                          value={edu.graduation_year}
                          onChange={(e) => updateEducationField(idx, 'graduation_year', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`edu_${idx}_graduation_year`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. 2022"
                        />
                        {validationErrors[`edu_${idx}_graduation_year`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`edu_${idx}_graduation_year`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">GPA / Grade Scale (Optional)</label>
                        <input
                          type="text"
                          value={edu.gpa}
                          onChange={(e) => updateEducationField(idx, 'gpa', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
                          placeholder="e.g. 3.9/4.0 or 9.2/10"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EXPERIENCE */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
              <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-amber-400" />
                Internships & Projects
              </h4>
              <button
                type="button"
                onClick={addExperience}
                className="flex items-center gap-1 bg-indigo-950 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Internship / Project</span>
              </button>
            </div>

            {experience.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Briefcase className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-xs">No internship or project records added yet.</p>
                <p className="text-slate-600 text-[11px] mt-1">List academic/personal projects, internship roles, or fresher highlights.</p>
                <button
                  type="button"
                  onClick={addExperience}
                  className="mt-3 inline-flex items-center gap-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs py-1.5 px-3 rounded-lg border border-slate-700 font-semibold cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add Internship / Project
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
                {experience.map((exp, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-4 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove internship/project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Company / Institution / Project Name *</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperienceField(idx, 'company', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`exp_${idx}_company`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Acme Corp or Personal Project"
                        />
                        {validationErrors[`exp_${idx}_company`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`exp_${idx}_company`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Role / Project Title *</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateExperienceField(idx, 'role', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`exp_${idx}_role`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Intern Developer or E-Commerce App"
                        />
                        {validationErrors[`exp_${idx}_role`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`exp_${idx}_role`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Start Date *</label>
                        <input
                          type="text"
                          value={exp.start_date}
                          onChange={(e) => updateExperienceField(idx, 'start_date', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`exp_${idx}_start_date`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Jun 2022"
                        />
                        {validationErrors[`exp_${idx}_start_date`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`exp_${idx}_start_date`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">End Date / Present *</label>
                        <input
                          type="text"
                          value={exp.end_date}
                          onChange={(e) => updateExperienceField(idx, 'end_date', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`exp_${idx}_end_date`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Present or Dec 2023"
                        />
                        {validationErrors[`exp_${idx}_end_date`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`exp_${idx}_end_date`]}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Location (e.g. Remote, On-site, City) *</label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => updateExperienceField(idx, 'location', e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 ${validationErrors[`exp_${idx}_location`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Remote, On-site, or San Francisco, CA"
                        />
                        {validationErrors[`exp_${idx}_location`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`exp_${idx}_location`]}</p>
                        )}
                      </div>

                      {/* Description Bullets */}
                      <div className="md:col-span-2 space-y-2 border-t border-slate-850 pt-2 mt-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase">Key Highlights / Deliverables * (Quantify impact or detail tech used)</label>
                          <button
                            type="button"
                            onClick={() => addExperienceBullet(idx)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add Highlight
                          </button>
                        </div>

                        {validationErrors[`exp_${idx}_description`] && (
                          <p className="text-rose-400 text-[10px] flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {validationErrors[`exp_${idx}_description`]}</p>
                        )}

                        {exp.description.map((b, bIdx) => (
                          <div key={bIdx} className="flex gap-2">
                            <input
                              type="text"
                              value={b}
                              onChange={(e) => updateExperienceBullet(idx, bIdx, e.target.value)}
                              className="flex-1 bg-slate-900 border border-slate-850 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
                              placeholder="e.g. Built full-stack inventory manager using React, Node.js, and MongoDB."
                            />
                            <button
                              type="button"
                              onClick={() => removeExperienceBullet(idx, bIdx)}
                              className="text-slate-500 hover:text-rose-400 transition shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: SKILLS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-4">
              <h4 className="text-white text-sm font-semibold flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-emerald-400" />
                Technical Skills & Competencies
              </h4>
              <button
                type="button"
                onClick={addSkillsCategory}
                className="flex items-center gap-1 bg-indigo-950 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>Add Category</span>
              </button>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                <Wrench className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-xs">No skills categories created yet.</p>
                <p className="text-slate-600 text-[11px] mt-1">Group your expertise, like "Languages", "Backend Frameworks", etc.</p>
                <button
                  type="button"
                  onClick={addSkillsCategory}
                  className="mt-3 inline-flex items-center gap-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs py-1.5 px-3 rounded-lg border border-slate-700 font-semibold cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add First Category
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {skills.map((sk, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-4 relative space-y-3">
                    <button
                      type="button"
                      onClick={() => removeSkillsCategory(idx)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="grid grid-cols-1 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Category Name *</label>
                        <input
                          type="text"
                          value={sk.category}
                          onChange={(e) => updateSkillsCategoryName(idx, e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 font-semibold ${validationErrors[`sk_${idx}_category`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="e.g. Languages & Frameworks"
                        />
                        {validationErrors[`sk_${idx}_category`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`sk_${idx}_category`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Keywords * (Comma separated list)</label>
                        <input
                          type="text"
                          value={sk.skills.join(', ')}
                          onChange={(e) => updateSkillsKeywords(idx, e.target.value)}
                          className={`w-full bg-slate-900 border rounded px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500 font-mono text-[11px] ${validationErrors[`sk_${idx}_skills`] ? 'border-rose-500/60' : 'border-slate-850'}`}
                          placeholder="Python, Go, FastAPI, Django"
                        />
                        {validationErrors[`sk_${idx}_skills`] && (
                          <p className="text-rose-400 text-[10px] mt-1">{validationErrors[`sk_${idx}_skills`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & BUILD */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h4 className="text-white text-sm font-semibold flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Review Structural Integrity & PDF Generation
            </h4>

            {/* User ID Field to Save Draft */}
            <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <label className="text-xs font-semibold text-slate-200">Database Document Identity (User ID) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">ID:</span>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className={`bg-slate-900 border rounded px-3 py-1 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 w-44 ${validationErrors.user_id ? 'border-rose-500' : 'border-slate-800'}`}
                    placeholder="e.g. candidate_45"
                  />
                </div>
              </div>
              {validationErrors.user_id && (
                <p className="text-rose-400 text-[10px] flex items-center gap-1 justify-end"><AlertCircle className="h-3 w-3" /> {validationErrors.user_id}</p>
              )}
              <p className="text-[11px] text-slate-500 leading-normal">
                This identifier acts as the document search key in MongoDB. Saving compiles the schema into an upsert operation.
              </p>
            </div>

            {/* Quick Summary Metadata Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Candidate Header</span>
                <span className="text-white font-bold block mt-1">{profile.full_name || 'Not Filled'}</span>
                <span className="text-slate-400 block text-[11px] mt-0.5">{profile.email || 'No Email'}</span>
              </div>

              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Structural Nodes Counts</span>
                <div className="flex gap-4 mt-2 text-[11px] font-mono">
                  <span className="text-cyan-400">Schools: {education.length}</span>
                  <span className="text-amber-400">Jobs: {experience.length}</span>
                  <span className="text-emerald-400">Skill Groups: {skills.length}</span>
                </div>
              </div>
            </div>

            {/* Save & Download Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer ${
                  isSaving 
                    ? 'bg-indigo-900/60 text-indigo-400 border border-indigo-500/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 border border-indigo-500/20'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Synchronizing MongoDB Draft...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4.5 w-4.5" />
                    <span>Save Structural Data (DB Upsert)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/80 text-white py-3 px-4 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/10 border border-emerald-500/20 cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Streaming PDF binary...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4.5 w-4.5" />
                    <span>Download Clean ATS PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* API Status Alerts */}
            {apiResponse.status !== 'idle' && (
              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                apiResponse.status === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <div className="p-1 rounded bg-white/5 shrink-0 mt-0.5">
                  {apiResponse.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-semibold block">{apiResponse.status === 'success' ? 'MongoDB Operations Complete' : 'Backend Validation Failure'}</span>
                  <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{apiResponse.message}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 disabled:opacity-0 disabled:pointer-events-none transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Previous Step</span>
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/10 border border-indigo-500/20 cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="text-[10px] text-slate-500 font-mono hidden md:block flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Ready for compiler dispatch</span>
          </div>
        )}
      </div>
    </div>
  );
}
