import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Vote, Plus, Play, Square, RefreshCw, BarChart2, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface PollPreset {
  question: string;
  options: string[];
}

const PRESET_POLLS: PollPreset[] = [
  {
    question: 'How well is the concept of quantum superposition understood so far?',
    options: ['Fully clear', 'Somewhat clear, need more examples', 'Confused, please recap', 'Completely lost']
  },
  {
    question: 'Should a hands-on coding lab on TypeScript Enums be scheduled for next week?',
    options: ['Yes, absolutely', 'No, let\'s stick to the current plan', 'Maybe, if optional']
  },
  {
    question: 'Which visual analogy for "event horizon" was most effective?',
    options: ['The whirlpool analogy', 'The cosmic waterfall model', 'The escape velocity equation', 'None of them yet']
  }
];

interface PollsManagerProps {
  roomCode: string;
  isDbConnected: boolean;
}

export default function PollsManager({ roomCode, isDbConnected }: PollsManagerProps) {
  const [question, setQuestion] = useState(PRESET_POLLS[0].question);
  const [options, setOptions] = useState<string[]>(PRESET_POLLS[0].options);
  const [newOption, setNewOption] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [votes, setVotes] = useState<Record<number, number>>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [totalVotesCount, setTotalVotesCount] = useState(0);

  const [needsSchemaUpdate, setNeedsSchemaUpdate] = useState(false);
  const [isUsingDb, setIsUsingDb] = useState(false);

  // Sync with Supabase active_polls
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected || !roomCode) {
      setIsUsingDb(false);
      return;
    }

    const fetchPoll = async () => {
      try {
        const { data, error } = await supabase
          .from('active_polls')
          .select('*')
          .eq('room_code', roomCode)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn('Supabase active polls fetching info (falling back to local state):', error.message || error);
          setNeedsSchemaUpdate(true);
          setIsUsingDb(false);
          return;
        }

        setNeedsSchemaUpdate(false);
        setIsUsingDb(true);

        if (data && data.length > 0) {
          const latestPoll = data[0];
          setQuestion(latestPoll.question);
          setOptions(latestPoll.options);
          setIsActive(latestPoll.is_active);
          
          // votes is stored as JSONB like {"0": 5, "1": 2}
          const rawVotes = latestPoll.votes || {};
          const mappedVotes: Record<number, number> = {};
          latestPoll.options.forEach((_: any, idx: number) => {
            mappedVotes[idx] = Number(rawVotes[idx] || 0);
          });
          setVotes(mappedVotes);
          setTotalVotesCount(latestPoll.total_votes || 0);
        }
      } catch (err) {
        console.error('Poll fetch exception:', err);
      }
    };

    fetchPoll();
    const interval = setInterval(fetchPoll, 2500);

    return () => clearInterval(interval);
  }, [roomCode, isDbConnected]);

  // Push updates to Supabase
  const pushPollState = async (newQuest: string, newOpts: string[], isAct: boolean, currentVotes: Record<number, number>, totalV: number) => {
    if (!isUsingDb) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('active_polls')
        .select('id')
        .eq('room_code', roomCode)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        // Update the existing row
        await supabase
          .from('active_polls')
          .update({
            question: newQuest,
            options: newOpts,
            is_active: isAct,
            votes: currentVotes,
            total_votes: totalV,
            created_at: new Date().toISOString()
          })
          .eq('id', data[0].id);
      } else {
        // Insert a new row
        await supabase
          .from('active_polls')
          .insert({
            room_code: roomCode,
            question: newQuest,
            options: newOpts,
            is_active: isAct,
            votes: currentVotes,
            total_votes: totalV,
            created_at: new Date().toISOString()
          });
      }
    } catch (err) {
      console.error('Error pushing poll state:', err);
    }
  };

  const handleSelectPreset = (preset: PollPreset) => {
    if (isActive) return;
    setQuestion(preset.question);
    setOptions(preset.options);
    const initialVotes: Record<number, number> = {};
    preset.options.forEach((_, idx) => {
      initialVotes[idx] = 0;
    });
    setVotes(initialVotes);
    setTotalVotesCount(0);

    if (isUsingDb) {
      pushPollState(preset.question, preset.options, false, initialVotes, 0);
    }
  };

  const handleAddOption = () => {
    if (isActive || !newOption.trim()) return;
    const updatedOpts = [...options, newOption.trim()];
    setOptions(updatedOpts);
    setNewOption('');

    if (isUsingDb) {
      pushPollState(question, updatedOpts, false, votes, totalVotesCount);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (isActive || options.length <= 2) return;
    const updatedOpts = options.filter((_, idx) => idx !== index);
    setOptions(updatedOpts);

    if (isUsingDb) {
      pushPollState(question, updatedOpts, false, votes, totalVotesCount);
    }
  };

  const handleStartPoll = () => {
    setIsActive(true);
    const initialVotes: Record<number, number> = {};
    options.forEach((_, idx) => {
      initialVotes[idx] = 0;
    });
    setVotes(initialVotes);
    setTotalVotesCount(0);

    if (isUsingDb) {
      pushPollState(question, options, true, initialVotes, 0);
    }
  };

  const handleStopPoll = () => {
    setIsActive(false);
    if (isUsingDb) {
      pushPollState(question, options, false, votes, totalVotesCount);
    }
  };

  const handleIncrementVote = (idx: number) => {
    if (!isActive) return;
    const nextVotes = { ...votes };
    nextVotes[idx] = (nextVotes[idx] || 0) + 1;
    const nextTotal = totalVotesCount + 1;

    setVotes(nextVotes);
    setTotalVotesCount(nextTotal);

    if (isUsingDb) {
      pushPollState(question, options, isActive, nextVotes, nextTotal);
    }
  };

  const handleDecrementVote = (idx: number) => {
    if (!isActive || (votes[idx] || 0) <= 0) return;
    const nextVotes = { ...votes };
    nextVotes[idx] = Math.max(0, (nextVotes[idx] || 0) - 1);
    const nextTotal = Math.max(0, totalVotesCount - 1);

    setVotes(nextVotes);
    setTotalVotesCount(nextTotal);

    if (isUsingDb) {
      pushPollState(question, options, isActive, nextVotes, nextTotal);
    }
  };

  const handleSimulateResponses = () => {
    if (!isActive) return;
    const addedCount = 10;
    const nextVotes = { ...votes };
    for (let i = 0; i < addedCount; i++) {
      const randomOptionIdx = Math.floor(Math.random() * options.length);
      nextVotes[randomOptionIdx] = (nextVotes[randomOptionIdx] || 0) + 1;
    }
    const nextTotal = totalVotesCount + addedCount;

    setVotes(nextVotes);
    setTotalVotesCount(nextTotal);

    if (isUsingDb) {
      pushPollState(question, options, isActive, nextVotes, nextTotal);
    }
  };

  const handleResetPoll = () => {
    setIsActive(false);
    const initialVotes: Record<number, number> = {};
    options.forEach((_, idx) => {
      initialVotes[idx] = 0;
    });
    setVotes(initialVotes);
    setTotalVotesCount(0);

    if (isUsingDb) {
      pushPollState(question, options, false, initialVotes, 0);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans" id="polls-manager-root">
      {/* Schema Notice */}
      {needsSchemaUpdate && (
        <div className="col-span-12 p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>
            <strong>Optional Database Tables Needed:</strong> To enable real-time cloud-persisted surveys, run the updated SQL schema found in the Settings script on your Supabase dashboard. Falling back to local state memory.
          </div>
        </div>
      )}

      {/* Configuration Column */}
      <div className="lg:col-span-5 space-y-5">
        <div className="glass-panel p-5 border border-cosmic-border rounded-xl space-y-4 bg-gray-950/40">
          <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Vote className="w-4 h-4 text-emerald-400" />
            Quick Poll Configurator
          </h3>

          {/* Preset Buttons */}
          <div>
            <label className="text-[10px] text-gray-500 font-mono uppercase block mb-2">Preset Poll Questions</label>
            <div className="space-y-2">
              {PRESET_POLLS.map((p, idx) => (
                <button
                  key={idx}
                  disabled={isActive}
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full text-left text-xs p-2.5 rounded-lg border text-gray-300 transition-all cursor-pointer ${
                    question === p.question
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                      : 'bg-gray-950/40 border-gray-900 hover:border-gray-800 disabled:opacity-50'
                  }`}
                >
                  {p.question}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Question */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 font-mono uppercase block">Custom Question</label>
            <textarea
              disabled={isActive}
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (isUsingDb) pushPollState(e.target.value, options, false, votes, totalVotesCount);
              }}
              className="w-full text-xs p-3 rounded-lg bg-gray-950 border border-gray-900 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50 resize-none h-16 font-sans"
              placeholder="Type your custom poll question here..."
            />
          </div>

          {/* Options List */}
          <div className="space-y-2">
            <label className="text-[10px] text-gray-500 font-mono uppercase block">Poll Choices</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-gray-500 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    disabled={isActive}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...options];
                      updated[idx] = e.target.value;
                      setOptions(updated);
                      if (isUsingDb) pushPollState(question, updated, false, votes, totalVotesCount);
                    }}
                    className="flex-1 text-xs p-2 bg-gray-950/80 border border-gray-900 rounded-md text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                  {options.length > 2 && (
                    <button
                      disabled={isActive}
                      onClick={() => handleRemoveOption(idx)}
                      className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-30 p-1 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 6 && (
              <div className="flex gap-2 pt-1.5">
                <input
                  type="text"
                  disabled={isActive}
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add custom option..."
                  className="flex-1 text-xs px-2.5 py-1.5 bg-gray-950 border border-gray-900 rounded-md text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                />
                <button
                  type="button"
                  disabled={isActive || !newOption.trim()}
                  onClick={handleAddOption}
                  className="px-3 rounded-md bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white text-xs flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Control Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {!isActive ? (
              <button
                onClick={handleStartPoll}
                className="col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" /> Launch Poll Stream
              </button>
            ) : (
              <>
                <button
                  onClick={handleStopPoll}
                  className="py-2 rounded-xl bg-gray-950 hover:bg-gray-900 border border-red-500/40 text-red-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
                <button
                  onClick={handleResetPoll}
                  className="py-2 rounded-xl bg-gray-950 hover:bg-gray-900 border border-gray-800 text-gray-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Analytics Column */}
      <div className="lg:col-span-7 space-y-5">
        <div className="glass-panel p-5 border border-cosmic-border rounded-xl flex flex-col h-full min-h-[380px] bg-gray-950/40">
          <div className="flex justify-between items-start mb-4 border-b border-gray-900 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  Live Opinion Feed
                </h3>
                {isUsingDb && (
                  <span className="text-[8px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono uppercase px-1.5 rounded font-bold animate-pulse">
                    DB Live
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Real-Time Survey Analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-700'}`} />
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                {isActive ? 'Active Survey' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            {/* Poll Question Display */}
            <div className="mb-4 bg-gray-950/30 p-4 border border-gray-900 rounded-xl">
              <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider block mb-1">BROADCAST QUESTION</span>
              <p className="text-sm font-sans font-semibold text-white tracking-wide">{question}</p>
            </div>

            {/* Live Chart Visualizations */}
            <div className="space-y-4 my-4">
              {options.map((opt, idx) => {
                const count = votes[idx] || 0;
                const pct = totalVotesCount > 0 ? Math.round((count / totalVotesCount) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono items-center">
                      <span className="text-gray-300 font-sans truncate pr-4 max-w-[60%]">{idx + 1}. {opt}</span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {isActive && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleIncrementVote(idx)}
                              className="text-gray-400 hover:text-emerald-400 p-0.5 transition-colors cursor-pointer"
                              title="Add vote"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDecrementVote(idx)}
                              disabled={count <= 0}
                              className="text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none p-0.5 transition-colors cursor-pointer"
                              title="Subtract vote"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <span className="text-gray-400 font-mono">
                          <strong className="text-emerald-400 font-bold">{count}</strong> responses ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-950 overflow-hidden border border-gray-900">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Votes and Simulation Trigger */}
            <div className="border-t border-gray-900 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-center sm:text-left">
                <span className="text-[10px] text-gray-500 font-mono block uppercase">Total Responses Logged</span>
                <span className="text-lg font-mono font-black text-white">{totalVotesCount}</span>
              </div>

              {isActive && (
                <button
                  type="button"
                  onClick={handleSimulateResponses}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.05)] cursor-pointer"
                >
                  Simulate Random Group Input (+10)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
