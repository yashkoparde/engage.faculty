import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Users, Volume2, Sparkles, Trophy, HelpCircle, AlertCircle, Play, Star, Award, Trash2 } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface SeminarProps {
  roomCode: string;
  isDbConnected: boolean;
}

const PRESET_TOPICS = [
  'Explain the "double-slit experiment" in quantum physics.',
  'How do TypeScript interfaces differ from types in runtime execution?',
  'Why is the event horizon of a black hole considered a point of no return?',
  'Explain "Quantum Decoherence" and why it poses a challenge for qubits.',
  'What is the difference between client-side rendering and server-side rendering?'
];

export default function SpeedTyper({ roomCode, isDbConnected }: SeminarProps) {
  const [topic, setTopic] = useState(PRESET_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinName, setSpinName] = useState<string>('');
  
  // Scoring / rating state
  const [ratingScore, setRatingScore] = useState<number>(85);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  
  const [needsSchemaUpdate, setNeedsSchemaUpdate] = useState(false);
  const [isUsingDb, setIsUsingDb] = useState(false);

  // 1. Fetch Students and Discussion History from database
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected || !roomCode) {
      setIsUsingDb(false);
      return;
    }

    setIsUsingDb(true);

    const fetchSeminarData = async () => {
      try {
        // Fetch connected students
        const { data: students, error: studErr } = await supabase
          .from('students')
          .select('*')
          .eq('room_code', roomCode);

        if (!studErr && students) {
          setDbStudents(students);
        }

        // Fetch logs from speedtyper_records (reused for Seminar logs)
        const { data: logs, error: logsErr } = await supabase
          .from('speedtyper_records')
          .select('*')
          .eq('room_code', roomCode)
          .order('created_at', { ascending: false });

        if (!logsErr && logs) {
          setFeedbackHistory(logs);
        } else if (logsErr && logsErr.code === '42P01') {
          setNeedsSchemaUpdate(true);
        }
      } catch (err) {
        console.error('Error fetching seminar details:', err);
      }
    };

    fetchSeminarData();
    const interval = setInterval(fetchSeminarData, 2500);
    return () => clearInterval(interval);
  }, [roomCode, isDbConnected]);

  // Sync the Seminar State to Rooms table
  const pushSeminarState = async (activeTopic: string, speakerName: string | null) => {
    if (!isUsingDb) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase
        .from('rooms')
        .update({
          current_activity_id: `seminar:${activeTopic}`,
          activity_status: speakerName ? `speaker:${speakerName}` : 'idle'
        })
        .eq('room_code', roomCode);
    } catch (err) {
      console.error('Error syncing seminar state to database:', err);
    }
  };

  // Select a random speaker with a visual spinning cycle
  const handleSelectSpeaker = () => {
    if (dbStudents.length === 0) return;
    setIsSpinning(true);
    setSelectedSpeaker(null);
    pushSeminarState(topic, null);

    let count = 0;
    const interval = setInterval(() => {
      const randomStudent = dbStudents[Math.floor(Math.random() * dbStudents.length)];
      setSpinName(randomStudent.name);
      count++;

      if (count > 15) {
        clearInterval(interval);
        // Final choice
        const finalStudent = dbStudents[Math.floor(Math.random() * dbStudents.length)];
        setSelectedSpeaker(finalStudent.name);
        setSpinName('');
        setIsSpinning(false);
        pushSeminarState(topic, finalStudent.name);
      }
    }, 120);
  };

  // Submit explanation feedback score to Leaderboard & History
  const handleSubmitFeedback = async () => {
    if (!selectedSpeaker || !isDbConnected) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // 1. Log turn in speedtyper_records
      await supabase
        .from('speedtyper_records')
        .insert({
          room_code: roomCode,
          student_name: selectedSpeaker,
          word: topic.substring(0, 50), // Topic
          time_seconds: 60.00, // Speaking time
          wpm: ratingScore, // Speaker score
          accuracy: ratingScore
        });

      // 2. Award score points to selected student
      const studentObj = dbStudents.find(s => s.name === selectedSpeaker);
      if (studentObj) {
        const nextScore = (studentObj.score || 0) + Number(ratingScore);
        await supabase
          .from('students')
          .update({ score: nextScore })
          .eq('id', studentObj.id);
      }

      // Clear speaker selection and notify
      setSelectedSpeaker(null);
      pushSeminarState('', null);
    } catch (err) {
      console.error('Error logging feedback:', err);
    }
  };

  // Remove feedback log
  const handleDeleteFeedbackLog = async (logId: string) => {
    const supabase = getSupabaseClient();
    if (supabase && isDbConnected) {
      await supabase
        .from('speedtyper_records')
        .delete()
        .eq('id', logId);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans" id="seminar-manager-root">
      {/* Schema notice if database logs are not ready */}
      {needsSchemaUpdate && (
        <div className="col-span-12 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>
            <strong>Optional Table Required:</strong> To persist permanent speech logs, make sure the <code>speedtyper_records</code> table is built in your Supabase DB.
          </div>
        </div>
      )}

      {/* Topic Selection Panel (Left Column) */}
      <div className="lg:col-span-5 space-y-5">
        <div className="glass-panel p-5 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-4">
          <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-rose-400" />
            Seminar Topic Selection
          </h3>
          <p className="text-[10px] text-gray-500 font-mono uppercase leading-normal">
            Select or enter an assessment topic. Students will see it in real-time as they are called to explain.
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {PRESET_TOPICS.map((t, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTopic(t);
                  pushSeminarState(t, selectedSpeaker);
                }}
                className={`w-full p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  topic === t 
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-bold' 
                    : 'bg-gray-950/50 border-gray-900 text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-900">
            <label className="text-[10px] text-gray-500 font-mono uppercase block">Or write a Custom Topic / Question</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom prompt..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-lg bg-black border border-gray-900 text-white focus:outline-none focus:border-rose-500 font-sans"
              />
              <button
                onClick={() => {
                  if (customTopic.trim()) {
                    setTopic(customTopic.trim());
                    pushSeminarState(customTopic.trim(), selectedSpeaker);
                    setCustomTopic('');
                  }
                }}
                className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono rounded-lg cursor-pointer"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Random Speaker Selector Wheel (Middle/Right Column) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-6 min-h-[420px] flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <div>
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-500" />
                  Live Speaker Selection Wheel
                </h3>
                <span className="text-[10px] text-gray-500 font-mono uppercase block mt-0.5">Stream Sync Active</span>
              </div>
              <span className="text-[9px] bg-rose-500/15 border border-rose-500/20 text-rose-400 font-mono uppercase px-2 py-0.5 rounded font-black animate-pulse">
                DB LIVE
              </span>
            </div>

            {/* Selected Speaker Wheel Output */}
            <div className="p-8 rounded-2xl bg-gray-950 border border-gray-900 text-center flex flex-col justify-center items-center min-h-[160px] relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

              <AnimatePresence mode="wait">
                {isSpinning ? (
                  <motion.div
                    key="spinning"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1.1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="space-y-2"
                  >
                    <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest block animate-pulse">🎯 SPINNING THE CLASS WHEEL...</span>
                    <span className="text-2xl font-mono font-black text-rose-400">@{spinName}</span>
                  </motion.div>
                ) : selectedSpeaker ? (
                  <motion.div
                    key="selected"
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="space-y-2.5"
                  >
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest block bg-emerald-500/10 px-2.5 py-0.5 rounded-full w-fit mx-auto animate-bounce">
                      🎙️ Selected Classroom Speaker
                    </span>
                    <h4 className="text-3xl font-mono font-black text-white tracking-wide">
                      @{selectedSpeaker}
                    </h4>
                    <p className="text-xs text-rose-400 max-w-sm mx-auto font-sans">
                      Currently explaining: <strong className="text-gray-200">"{topic}"</strong>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    className="space-y-1.5"
                  >
                    <HelpCircle className="w-8 h-8 text-gray-700 mx-auto" />
                    <span className="text-xs font-mono text-gray-500">No speaker selected yet for this topic.</span>
                    <span className="text-[10px] text-gray-600 font-mono block">Make sure you have students joined to spin!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Footer for Presenter */}
          <div className="border-t border-gray-900 pt-4 space-y-4">
            {selectedSpeaker ? (
              /* Speaker Scoring Panel */
              <div className="space-y-4 bg-gray-950/60 p-4 rounded-xl border border-gray-900">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-gray-400 uppercase">Rate explanation clarity (0-100 pts):</span>
                  <strong className="text-amber-400 text-sm font-black">{ratingScore} points</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={ratingScore}
                  onChange={(e) => setRatingScore(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitFeedback}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" /> Save & Award Score Points
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSpeaker(null);
                      pushSeminarState('', null);
                    }}
                    className="px-4 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              /* Wheel Trigger buttons */
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSelectSpeaker}
                  disabled={dbStudents.length === 0 || isSpinning}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-mono text-xs font-bold uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.15)] flex items-center justify-center gap-2 disabled:from-gray-950 disabled:border-gray-900 disabled:text-gray-700 cursor-pointer"
                >
                  <Users className="w-4 h-4" /> Pick Random Speaker ({dbStudents.length} Connected)
                </button>
              </div>
            )}

            {/* Discussion History logs */}
            {feedbackHistory.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">Seminar speech logs</span>
                <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                  {feedbackHistory.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-2.5 bg-gray-950/60 border border-gray-900 rounded-lg flex justify-between items-center text-[10px] font-mono">
                      <div className="min-w-0">
                        <span className="text-gray-200 font-bold block">@{log.student_name}</span>
                        <p className="text-gray-500 truncate w-48 sm:w-80">Topic: "{log.word}"</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-black">★ {log.wpm} pts</span>
                        <button
                          onClick={() => handleDeleteFeedbackLog(log.id)}
                          className="p-1 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
