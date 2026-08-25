import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, ThumbsUp, Check, Plus, RefreshCw, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface Question {
  id: string;
  studentName: string;
  questionText: string;
  votes: number;
  isAnswered: boolean;
  timeStr: string;
  answerText?: string;
}

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    studentName: 'AstroNova',
    questionText: 'Can you clarify how a particle is "observed"? Does it require a conscious observer, or just physical interaction with a sensor?',
    votes: 18,
    isAnswered: false,
    timeStr: '2m ago'
  },
  {
    id: 'q-2',
    studentName: 'VectorVolt',
    questionText: 'Are TypeScript enums completely transpiled away, or do they exist at runtime as real JavaScript objects?',
    votes: 12,
    isAnswered: true,
    timeStr: '5m ago'
  },
  {
    id: 'q-3',
    studentName: 'SigmaStar',
    questionText: 'In a real quantum computer, what are the primary physical sources of environmental decoherence?',
    votes: 9,
    isAnswered: false,
    timeStr: '11m ago'
  }
];

const SIMULATED_POOL = [
  'Does Hawking radiation mean black holes eventually evaporate completely?',
  'What is the difference between const enums and regular enums regarding memory optimization?',
  'Can we implement multiple types inside a single record in TypeScript?',
  'How do gravitational waves convey information without speed of light lag?',
  'If particles in entanglement are separated by light years, is information transferred instantly?'
];

const SIMULATED_STUDENTS = ['ZeroGravity', 'BinaryGalaxy', 'NebulaAura', 'QuantumCoder', 'SuperPosition'];

interface QAArenaProps {
  roomCode: string;
  isDbConnected: boolean;
}

export default function QAArena({ roomCode, isDbConnected }: QAArenaProps) {
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [customText, setCustomText] = useState('');
  const [customStudent, setCustomStudent] = useState('Dr. Savita (Faculty)');
  const [sortBy, setSortBy] = useState<'votes' | 'recent'>('votes');
  const [needsSchemaUpdate, setNeedsSchemaUpdate] = useState(false);
  const [isUsingDb, setIsUsingDb] = useState(false);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});

  const handleSaveAnswerText = async (id: string, text: string) => {
    if (!text.trim()) return;
    if (isUsingDb) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase
            .from('qa_questions')
            .update({ answer_text: text, is_answered: true })
            .eq('id', id);
        } catch (err) {
          console.error('Error saving answer text:', err);
        }
      }
    } else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, answerText: text, isAnswered: true } : q));
    }
    setAnswersMap(prev => ({ ...prev, [id]: '' }));
  };

  // Periodically fetch Q&A questions from Supabase if connected
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected || !roomCode) {
      setIsUsingDb(false);
      return;
    }

    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('qa_questions')
          .select('*')
          .eq('room_code', roomCode);

        if (error) {
          console.warn('Supabase QA questions fetching info (falling back to local state):', error.message || error);
          setNeedsSchemaUpdate(true);
          setIsUsingDb(false);
          return;
        }

        setNeedsSchemaUpdate(false);
        setIsUsingDb(true);

        if (data) {
          const mapped: Question[] = data.map((q: any) => {
            const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(q.created_at).getTime()) / 60000));
            const timeStr = minutesAgo === 0 ? 'Just now' : `${minutesAgo}m ago`;
            return {
              id: q.id,
              studentName: q.student_name,
              questionText: q.question_text,
              votes: q.votes,
              isAnswered: q.is_answered,
              answerText: q.answer_text || '',
              timeStr
            };
          });
          setQuestions(mapped);
        }
      } catch (err) {
        console.error('QA fetch exception:', err);
      }
    };

    fetchQuestions();
    const interval = setInterval(fetchQuestions, 2500);

    return () => clearInterval(interval);
  }, [roomCode, isDbConnected]);

  const handleUpvote = async (id: string) => {
    if (isUsingDb) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const targetQ = questions.find(q => q.id === id);
        if (targetQ) {
          await supabase
            .from('qa_questions')
            .update({ votes: targetQ.votes + 1 })
            .eq('id', id);
        }
      }
    } else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, votes: q.votes + 1 } : q));
    }
  };

  const handleToggleAnswered = async (id: string) => {
    if (isUsingDb) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const targetQ = questions.find(q => q.id === id);
        if (targetQ) {
          await supabase
            .from('qa_questions')
            .update({ is_answered: !targetQ.isAnswered })
            .eq('id', id);
        }
      }
    } else {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, isAnswered: !q.isAnswered } : q));
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const name = customStudent.trim() || 'Anonymous Student';
    const text = customText.trim();

    if (isUsingDb) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { error } = await supabase
            .from('qa_questions')
            .insert({
              room_code: roomCode,
              student_name: name,
              question_text: text,
              votes: 1,
              is_answered: false
            });
          if (error) throw error;
          setCustomText('');
        } catch (err) {
          console.error('Error inserting QA question:', err);
        }
      }
    } else {
      const newQ: Question = {
        id: `q-${Date.now()}`,
        studentName: name,
        questionText: text,
        votes: 1,
        isAnswered: false,
        timeStr: 'Just now'
      };
      setQuestions([newQ, ...questions]);
      setCustomText('');
    }
  };

  const handleSimulateQuestions = async () => {
    const randomText = SIMULATED_POOL[Math.floor(Math.random() * SIMULATED_POOL.length)];
    const randomStudent = SIMULATED_STUDENTS[Math.floor(Math.random() * SIMULATED_STUDENTS.length)];
    
    if (questions.some(q => q.questionText === randomText)) return;

    if (isUsingDb) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase
            .from('qa_questions')
            .insert({
              room_code: roomCode,
              student_name: randomStudent,
              question_text: randomText,
              votes: Math.floor(Math.random() * 15) + 3,
              is_answered: false
            });
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      const newQ: Question = {
        id: `q-${Date.now()}`,
        studentName: randomStudent,
        questionText: randomText,
        votes: Math.floor(Math.random() * 15) + 3,
        isAnswered: false,
        timeStr: '1m ago'
      };
      setQuestions(prev => [newQ, ...prev]);
    }
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === 'votes') {
      return b.votes - a.votes;
    }
    return b.id.localeCompare(a.id);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="qa-arena-root">
      {/* Schema Notice */}
      {needsSchemaUpdate && (
        <div className="col-span-12 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>
            <strong>Optional Database Tables Needed:</strong> To enable real-time cloud-persisted Q&A, run the updated SQL schema found in the Settings script on your Supabase dashboard. Falling back to local state memory.
          </div>
        </div>
      )}

      {/* Question Submit Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="glass-panel p-5 border border-cosmic-border rounded-xl space-y-4">
          <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-sky-400" />
            Manual Question Injector
          </h3>

          <form onSubmit={handleAddQuestion} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono uppercase block">Student Handle</label>
              <input
                type="text"
                value={customStudent}
                onChange={(e) => setCustomStudent(e.target.value)}
                placeholder="Student alias..."
                className="w-full text-xs p-2.5 rounded-lg bg-gray-950 border border-gray-900 text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-mono uppercase block">Question Text</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Ask a tough concept question..."
                className="w-full text-xs p-3 rounded-lg bg-gray-950 border border-gray-900 text-white focus:outline-none focus:border-sky-500 h-24 resize-none font-sans"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(14,165,233,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Inject Question
            </button>
          </form>

          <div className="border-t border-gray-900 pt-4 text-center">
            <button
              type="button"
              onClick={handleSimulateQuestions}
              className="w-full py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/35 text-sky-400 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 fill-sky-500" />
              Simulate Student Question
            </button>
          </div>
        </div>
      </div>

      {/* Live Question Board Queue */}
      <div className="lg:col-span-7 space-y-5">
        <div className="glass-panel p-5 border border-cosmic-border rounded-xl h-full flex flex-col min-h-[380px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-900 pb-3 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  Student Question Board
                </h3>
                {isUsingDb && (
                  <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono uppercase px-1.5 rounded font-bold animate-pulse">
                    DB Live
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Real-time classroom question queue</p>
            </div>

            {/* Sorting controls */}
            <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-900">
              <button
                type="button"
                onClick={() => setSortBy('votes')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  sortBy === 'votes' ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Top Votes
              </button>
              <button
                type="button"
                onClick={() => setSortBy('recent')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                  sortBy === 'recent' ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Recent
              </button>
            </div>
          </div>

          {/* List of questions */}
          <div className="flex-1 mt-4 overflow-y-auto max-h-[300px] space-y-3 pr-1">
            <AnimatePresence initial={false}>
              {sortedQuestions.length > 0 ? (
                sortedQuestions.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`p-3.5 rounded-xl border transition-all flex justify-between items-start gap-4 ${
                      q.isAnswered
                        ? 'bg-emerald-950/5 border-emerald-900/30'
                        : 'bg-gray-950/40 border-gray-900 hover:border-gray-800'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-gray-300">@{q.studentName}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{q.timeStr}</span>
                        {q.isAnswered && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono uppercase font-black">
                            Answered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed font-sans">{q.questionText}</p>

                      {q.answerText && (
                        <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 mt-2 space-y-1">
                          <span className="text-[9px] text-emerald-400 font-mono uppercase font-black tracking-widest block">💡 Presenter Answer Text</span>
                          <p className="text-xs text-gray-300 font-sans leading-relaxed">{q.answerText}</p>
                        </div>
                      )}

                      {/* Inline text answer input */}
                      <div className="mt-2.5 pt-2 border-t border-gray-900/60 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type answer text..."
                          value={answersMap[q.id] || ''}
                          onChange={(e) => setAnswersMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                          className="flex-1 text-[11px] px-2 py-1 rounded bg-black border border-gray-900 text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveAnswerText(q.id, answersMap[q.id] || '')}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono font-bold uppercase transition-colors cursor-pointer"
                        >
                          Submit Answer
                        </button>
                      </div>
                    </div>

                    {/* Action buttons (Upvote & Answer Check) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Upvote Button */}
                      <button
                        type="button"
                        onClick={() => handleUpvote(q.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                          q.isAnswered
                            ? 'border-gray-900 text-gray-600 cursor-not-allowed'
                            : 'border-gray-800 bg-gray-900/40 hover:border-sky-500/30 text-sky-400'
                        }`}
                        disabled={q.isAnswered}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${q.isAnswered ? '' : 'fill-sky-400/10'}`} />
                        <span>{q.votes}</span>
                      </button>

                      {/* Mark Answered Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleAnswered(q.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          q.isAnswered
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'border-gray-800 bg-gray-900/40 hover:border-emerald-500/35 text-gray-500 hover:text-emerald-400'
                        }`}
                        title={q.isAnswered ? 'Mark as unanswered' : 'Mark as answered'}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-500">
                  <HelpCircle className="w-8 h-8 mx-auto text-gray-800 mb-2 animate-bounce" />
                  <p className="text-xs font-mono">No student questions submitted yet</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
