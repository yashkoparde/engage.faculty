import React, { useState } from 'react';
import { Plus, ListChecks, Clock, ShieldCheck, Play, ArrowRight, BookOpen, Trash2 } from 'lucide-react';
import { Activity } from '../types';

interface ActivityManagerProps {
  activities: Activity[];
  selectedActivityId: string | null;
  onSelectActivity: (id: string) => void;
  onCreateActivity: (activity: Omit<Activity, 'id'>) => void;
  onDeleteActivity: (id: string) => void;
  activeActivityStatus: 'idle' | 'active' | 'revealed';
}

export default function ActivityManager({
  activities,
  selectedActivityId,
  onSelectActivity,
  onCreateActivity,
  onDeleteActivity,
  activeActivityStatus,
}: ActivityManagerProps) {
  const [showCreator, setShowCreator] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [timeLimit, setTimeLimit] = useState(30);

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    // Fill empty options
    const finalOptions = options.map((opt, i) => opt.trim() || `Option ${['A', 'B', 'C', 'D'][i]}`);
    
    onCreateActivity({
      question: question.trim(),
      options: finalOptions,
      correctAnswer,
      timeLimit: Math.max(5, timeLimit),
    });

    // Reset fields
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('A');
    setTimeLimit(30);
    setShowCreator(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-cosmic-border relative overflow-hidden">
      <div className="absolute top-0 left-0 w-24 h-24 bg-violet-950/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-medium text-lg text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-cosmic-accent" />
            Lecture Activities Deck
          </h3>
          <p className="text-xs text-gray-400 font-mono">Select, configure, and push MCQ missions</p>
        </div>

        <button
          onClick={() => setShowCreator(!showCreator)}
          disabled={activeActivityStatus === 'active'}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cosmic-accent/25 hover:bg-cosmic-accent/40 text-cosmic-neon border border-cosmic-accent/30 text-xs font-mono font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreator ? 'View List' : 'Add MCQ'}
        </button>
      </div>

      {showCreator ? (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-gray-950/40 border border-gray-900/60">
          <div className="text-xs font-mono text-cosmic-neon font-bold flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> CREATE NEW MISSION
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Question Description</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which layer of the atmosphere contains the ozone layer?"
              className="w-full text-sm p-3 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-cosmic-accent/70 h-18 resize-none font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['A', 'B', 'C', 'D'].map((opt, idx) => (
              <div key={opt}>
                <label className="block text-xs font-mono text-gray-500 mb-1">Option {opt}</label>
                <input
                  type="text"
                  value={options[idx]}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Description for ${opt}`}
                  className="w-full text-xs p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-cosmic-accent/70 font-sans"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Correct Choice</label>
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-cosmic-accent/70 font-mono"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Time Limit (seconds)</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                  className="w-full text-xs p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white focus:outline-none focus:border-cosmic-accent/70 font-mono pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">s</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-cosmic-accent text-white font-mono text-xs font-bold hover:bg-violet-600 transition-colors"
            >
              Add Question
            </button>
            <button
              type="button"
              onClick={() => setShowCreator(false)}
              className="px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 font-mono text-xs hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto no-scrollbar pr-0.5">
          {activities.map((activity, index) => {
            const isSelected = selectedActivityId === activity.id;
            
            return (
              <div
                key={activity.id}
                onClick={() => {
                  if (activeActivityStatus !== 'active') {
                    onSelectActivity(activity.id);
                  }
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 relative group flex justify-between items-start ${
                  isSelected
                    ? 'border-cosmic-accent bg-cosmic-accent/10 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                    : 'border-gray-900 bg-gray-950/20 hover:border-gray-800'
                } ${activeActivityStatus === 'active' ? 'opacity-65 cursor-not-allowed' : ''}`}
              >
                {/* Content */}
                <div className="flex gap-3 min-w-0 pr-4">
                  <div className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                    isSelected ? 'bg-cosmic-accent text-white' : 'bg-gray-900 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold text-gray-200 truncate pr-2 group-hover:text-white transition-colors">
                      {activity.question}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {activity.timeLimit}s timer
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Correct: {activity.correctAnswer}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side delete / indicators */}
                <div className="flex items-center gap-2 shrink-0 self-center">
                  {isSelected && activeActivityStatus === 'revealed' && (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      FINISHED
                    </span>
                  )}
                  {isSelected && activeActivityStatus === 'active' && (
                    <span className="text-[10px] font-mono text-cosmic-neon font-bold bg-cosmic-accent/20 border border-cosmic-accent/30 px-1.5 py-0.5 rounded animate-pulse">
                      RUNNING
                    </span>
                  )}
                  {activeActivityStatus !== 'active' && activities.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteActivity(activity.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-rose-500/15 hover:text-rose-400 text-gray-600 transition-all"
                      title="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
