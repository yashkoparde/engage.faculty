import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Play, Square, Plus, Database, Sparkles, Clock, 
  BookOpen, Layers, Brain, BarChart3, MessageSquare, Target, 
  Award, Trophy, ChevronRight, CheckCircle2, ShieldCheck, HelpCircle,
  Smile, Flame, Star, Volume2, PlusCircle, Trash2, X, Copy, Settings
} from 'lucide-react';
import { Activity } from './types';
import { getSupabaseClient, getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials, SUPABASE_SQL_SCHEMA } from './lib/supabase';
import ActivityManager from './components/ActivityManager';
import PollsManager from './components/PollsManager';
import FlashcardsArena from './components/FlashcardsArena';
import QAArena from './components/QAArena';
import SpeedTyper from './components/SpeedTyper';

const topFeatures = [
  { id: 'overview', label: 'Overview', icon: GraduationCap },
  { id: 'launcher', label: 'MCQ Arena', icon: Play },
  { id: 'polls', label: 'Quick Polls', icon: BarChart3 },
  { id: 'flashcards', label: 'Flashcards', icon: Brain },
  { id: 'speedtyper', label: 'Seminar Arena', icon: Target }
];

const bottomFeatures = [
  { id: 'qa', label: 'Q&A Board', icon: MessageSquare },
  { id: 'mood', label: 'Mood Catcher', icon: Smile },
  { id: 'countdown', label: 'Stopwatch', icon: Clock },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'resources', label: 'Resource Vault', icon: BookOpen }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    question: 'Which type of electromagnetic radiation has the highest energy?',
    options: ['Radio waves', 'Visible light', 'Ultraviolet', 'Gamma Rays'],
    correctAnswer: 'D',
    timeLimit: 20
  },
  {
    id: 'act-2',
    question: 'Approximately how long does it take for light from the Sun to reach Earth?',
    options: ['8 seconds', '8 minutes', '8 hours', '8 days'],
    correctAnswer: 'B',
    timeLimit: 15
  },
  {
    id: 'act-3',
    question: 'Which TypeScript type represents a value that never occurs?',
    options: ['void', 'any', 'unknown', 'never'],
    correctAnswer: 'D',
    timeLimit: 30
  },
  {
    id: 'act-4',
    question: 'What famous animal paradox represents quantum superposition?',
    options: ["Pavlov's Dog", "Schrödinger's Cat", "Maxwell's Demon", "Darwin's Finch"],
    correctAnswer: 'B',
    timeLimit: 25
  }
];

export default function App() {
  // Room Setup state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const roomCodeKey = 'engage_room_code';
  const teacherNameKey = 'engage_teacher_name';
  const subjectNameKey = 'engage_subject_name';
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem(roomCodeKey) || 'ENGAGE1');
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem(teacherNameKey) || 'Dr. Savita');
  const [subjectName, setSubjectName] = useState(() => localStorage.getItem(subjectNameKey) || 'Quantum Astrophysics');

  // Parse URL query params for easy room routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // Interactive core state
  const [activities, setActivities] = useState<Activity[]>(DEFAULT_ACTIVITIES);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>('act-1');
  const [activeActivityStatus, setActiveActivityStatus] = useState<'idle' | 'active' | 'revealed'>('idle');
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerDuration, setTimerDuration] = useState(0);

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Supabase connection state
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isDbConnecting, setIsDbConnecting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState(() => getSupabaseCredentials()?.url || '');
  const [configKey, setConfigKey] = useState(() => getSupabaseCredentials()?.anonKey || '');

  // Live database states
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [dbSubmissions, setDbSubmissions] = useState<any[]>([]);
  const [dbConfusionVotes, setDbConfusionVotes] = useState<any[]>([]);

  // Real-time Mood tracker statistics
  const [moodStats, setMoodStats] = useState({ understood: 8, partial: 3, confused: 1 });

  // Real-time Resource Vault Links
  const [pushedLinks, setPushedLinks] = useState<Array<{ title: string; url: string }>>([
    { title: 'Quantum Mechanics arXiv Papers', url: 'https://arxiv.org/' },
    { title: 'TypeScript Handbooks & Docs', url: 'https://www.typescriptlang.org/' }
  ]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const handlePushLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    const newLink = { title: newLinkTitle.trim(), url: newLinkUrl.trim() };
    setPushedLinks(prev => [newLink, ...prev]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    triggerNotification('Pushed reference link to all student dashboards!');
  };

  // Custom Notifications banner
  const [notification, setNotification] = useState<string | null>(null);

  // Timer reference
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Supabase cloud connection listener
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !roomCode) {
      setIsDbConnected(false);
      return;
    }

    setIsDbConnecting(true);
    setDbError(null);

    const initDbRoom = async () => {
      try {
        // Try a simple select to test connectivity first
        const { error: pingError } = await supabase
          .from('rooms')
          .select('room_code')
          .limit(1);

        if (pingError) {
          throw pingError;
        }

        // We got a response from Supabase, so we are connected!
        setIsDbConnected(true);
        setDbError(null);

        if (isInitialized) {
          const currentActivity = activities.find(a => a.id === selectedActivityId);
          const { error: upsertError } = await supabase
            .from('rooms')
            .upsert({
              room_code: roomCode,
              teacher_name: teacherName,
              subject: subjectName,
              current_activity_id: selectedActivityId,
              current_question_text: currentActivity ? currentActivity.question : null,
              current_options: currentActivity ? currentActivity.options : null,
              current_correct_answer: currentActivity ? currentActivity.correctAnswer : null,
              activity_status: activeActivityStatus,
              timer_duration: currentActivity ? currentActivity.timeLimit : timerDuration,
              timer_remaining: timerRemaining,
              state: currentTab,
              updated_at: new Date().toISOString()
            });

          if (upsertError) {
            console.warn('Upsert room warning:', upsertError);
          }

          // Fetch room-specific activities from room_activities table
          try {
            const { data: dbActs, error: actsError } = await supabase
              .from('room_activities')
              .select('*')
              .eq('room_code', roomCode);

            if (!actsError && dbActs) {
              if (dbActs.length > 0) {
                const mapped: Activity[] = dbActs.map((row: any) => ({
                  id: row.id,
                  question: row.question,
                  options: row.options,
                  correctAnswer: row.correct_answer,
                  timeLimit: row.time_limit
                }));
                setActivities(mapped);
                if (mapped.length > 0) {
                  setSelectedActivityId(mapped[0].id);
                }
              } else {
                // Seed room_activities with default ones for this room code
                const seedData = DEFAULT_ACTIVITIES.map(act => ({
                  id: act.id,
                  room_code: roomCode,
                  question: act.question,
                  options: act.options,
                  correct_answer: act.correctAnswer,
                  time_limit: act.timeLimit
                }));
                
                await supabase.from('room_activities').insert(seedData);
                setActivities(DEFAULT_ACTIVITIES);
                setSelectedActivityId(DEFAULT_ACTIVITIES[0].id);
              }
            }
          } catch (e) {
            console.warn('Could not sync room_activities table. Using default local activities.', e);
          }
        }

        triggerNotification('Supabase Connection Live!');
      } catch (err: any) {
        console.warn('Supabase room connection warning:', err);
        const errMsg = err?.message || err?.details || String(err);
        setDbError(errMsg);
        setIsDbConnected(false);
      } finally {
        setIsDbConnecting(false);
      }
    };

    initDbRoom();
  }, [isInitialized, roomCode, reconnectTrigger]);

  // Load & subscribe to student records, submissions, and confusion votes
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || !isInitialized || !isDbConnected || !roomCode) return;

    const fetchAllData = async () => {
      try {
        // 1. Fetch Students
        const { data: studentsData, error: errStudents } = await supabase
          .from('students')
          .select('*')
          .eq('room_code', roomCode)
          .order('score', { ascending: false });
        if (!errStudents && studentsData) {
          setDbStudents(studentsData);
        }

        // 2. Fetch Submissions
        const { data: subsData, error: errSubs } = await supabase
          .from('submissions')
          .select('*')
          .eq('room_code', roomCode);
        if (!errSubs && subsData) {
          setDbSubmissions(subsData);
        }

        // 3. Fetch Confusion Votes
        const { data: votesData, error: errVotes } = await supabase
          .from('confusion_votes')
          .select('*')
          .eq('room_code', roomCode);
        if (!errVotes && votesData) {
          setDbConfusionVotes(votesData);
          
          let understood = 0;
          let partial = 0;
          let confused = 0;
          votesData.forEach((v: any) => {
            if (v.status === 'understood') understood++;
            else if (v.status === 'partial') partial++;
            else if (v.status === 'confused') confused++;
          });
          // Avoid 0 stats to look pretty
          setMoodStats({
            understood: Math.max(0, understood),
            partial: Math.max(0, partial),
            confused: Math.max(0, confused)
          });
        }
      } catch (err) {
        console.error('Error fetching room participants details:', err);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, isDbConnected, roomCode]);

  // Synchronize active tab with Supabase if connected
  useEffect(() => {
    const syncTab = async () => {
      const supabase = getSupabaseClient();
      if (supabase && isDbConnected && isInitialized) {
        try {
          await supabase
            .from('rooms')
            .update({
              state: currentTab,
              updated_at: new Date().toISOString()
            })
            .eq('room_code', roomCode);
        } catch (err) {
          console.error('Error syncing tab state:', err);
        }
      }
    };
    syncTab();
  }, [currentTab, isDbConnected, isInitialized]);

  // Synchronize current activity details with Supabase whenever selectedActivityId or activities change
  useEffect(() => {
    const syncSelectedActivity = async () => {
      const supabase = getSupabaseClient();
      if (supabase && isDbConnected && isInitialized && roomCode && selectedActivityId) {
        const currentActivity = activities.find(a => a.id === selectedActivityId);
        if (currentActivity) {
          try {
            await supabase
              .from('rooms')
              .update({
                current_activity_id: selectedActivityId,
                current_question_text: currentActivity.question,
                current_options: currentActivity.options,
                current_correct_answer: currentActivity.correctAnswer,
                timer_duration: currentActivity.timeLimit,
                updated_at: new Date().toISOString()
              })
              .eq('room_code', roomCode);
          } catch (err) {
            console.error('Error syncing selected activity details to Supabase:', err);
          }
        }
      }
    };
    syncSelectedActivity();
  }, [selectedActivityId, activities, isDbConnected, isInitialized, roomCode]);

  // Countdowns
  useEffect(() => {
    if (activeActivityStatus === 'active') {
      countdownIntervalRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          const nextVal = prev - 1;

          if (nextVal <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            handleEndActivity();
            return 0;
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeActivityStatus, roomCode]);

  // Sync Timer back to Supabase occasionally
  useEffect(() => {
    const syncTimer = async () => {
      const supabase = getSupabaseClient();
      if (supabase && isDbConnected && isInitialized) {
        try {
          await supabase
            .from('rooms')
            .update({
              timer_remaining: timerRemaining,
              activity_status: activeActivityStatus
            })
            .eq('room_code', roomCode);
        } catch (err) {
          console.error('Timer sync error:', err);
        }
      }
    };
    syncTimer();
  }, [timerRemaining, activeActivityStatus, isDbConnected, isInitialized]);

  // Custom activity creation
  const handleCreateActivity = async (newAct: Omit<Activity, 'id'>) => {
    const created: Activity = {
      ...newAct,
      id: `act-${Date.now()}`
    };
    setActivities(prev => [...prev, created]);
    setSelectedActivityId(created.id);

    const supabase = getSupabaseClient();
    if (supabase && isDbConnected) {
      try {
        await supabase
          .from('room_activities')
          .insert({
            id: created.id,
            room_code: roomCode,
            question: created.question,
            options: created.options,
            correct_answer: created.correctAnswer,
            time_limit: created.timeLimit
          });
      } catch (err) {
        console.error('Error saving custom activity to Supabase:', err);
      }
    }
    triggerNotification('Added custom MCQ question successfully!');
  };

  const handleDeleteActivity = async (id: string) => {
    setActivities(prev => prev.filter(act => act.id !== id));
    if (selectedActivityId === id) {
      const remaining = activities.filter(act => act.id !== id);
      setSelectedActivityId(remaining[0]?.id || null);
    }

    const supabase = getSupabaseClient();
    if (supabase && isDbConnected) {
      try {
        await supabase
          .from('room_activities')
          .delete()
          .eq('room_code', roomCode)
          .eq('id', id);
      } catch (err) {
        console.error('Error deleting activity from Supabase:', err);
      }
    }
    triggerNotification('MCQ deleted.');
  };

  // Launch MCQ countdown
  const handleLaunchActivity = async () => {
    if (!selectedActivityId) return;
    const currentActivity = activities.find(a => a.id === selectedActivityId);
    if (!currentActivity) return;

    setTimerDuration(currentActivity.timeLimit);
    setTimerRemaining(currentActivity.timeLimit);
    setActiveActivityStatus('active');

    const supabase = getSupabaseClient();
    if (supabase && isDbConnected) {
      try {
        await supabase
          .from('rooms')
          .update({
            current_activity_id: selectedActivityId,
            current_question_text: currentActivity.question,
            current_options: currentActivity.options,
            current_correct_answer: currentActivity.correctAnswer,
            activity_status: 'active',
            timer_duration: currentActivity.timeLimit,
            timer_remaining: currentActivity.timeLimit,
            timer_started_at: new Date().toISOString()
          })
          .eq('room_code', roomCode);
      } catch (err) {
        console.error('Launch activity Supabase sync error:', err);
      }
    }

    triggerNotification(`MCQ Launched: ${currentActivity.timeLimit}s countdown active.`);
  };

  // End active MCQ
  const handleEndActivity = async () => {
    setActiveActivityStatus('revealed');
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    const supabase = getSupabaseClient();
    if (supabase && isDbConnected) {
      try {
        await supabase
          .from('rooms')
          .update({
            activity_status: 'revealed'
          })
          .eq('room_code', roomCode);
      } catch (err) {
        console.error('Error syncing scoring to Supabase:', err);
      }
    }

    const currentActivity = activities.find(a => a.id === selectedActivityId);
    const correctChoice = currentActivity ? currentActivity.correctAnswer : '';
    triggerNotification(`Activity revealed. Correct answer option is ${correctChoice}.`);
  };

  // Dynamic simulation injectors (writing real records into Supabase)
  const handleSimulateAddStudent = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected) {
      triggerNotification('Please wait until database is connected.');
      return;
    }
    const names = ['AstroNova', 'VectorVolt', 'SigmaStar', 'ZeroGravity', 'BinaryGalaxy', 'NebulaAura', 'QuantumCoder', 'SuperPosition'];
    const unusedNames = names.filter(n => !dbStudents.some(s => s.name === n));
    const chosenName = unusedNames.length > 0 ? unusedNames[Math.floor(Math.random() * unusedNames.length)] : names[Math.floor(Math.random() * names.length)] + '_' + Math.floor(Math.random() * 100);

    try {
      const { error } = await supabase
        .from('students')
        .insert({
          room_code: roomCode,
          name: chosenName,
          score: Math.floor(Math.random() * 120) + 20,
          streak: Math.floor(Math.random() * 4) + 1,
          is_connected: true
        });
      if (error) throw error;
      triggerNotification(`Joined test student @${chosenName} to database successfully!`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('Failed to insert student: ' + err.message);
    }
  };

  const handleSimulateMCQSubmissions = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected) {
      triggerNotification('Database is not connected.');
      return;
    }
    if (!selectedActivityId) {
      triggerNotification('Please select or create an MCQ question first.');
      return;
    }

    let studentsToUse = [...dbStudents];
    if (studentsToUse.length === 0) {
      triggerNotification('No students registered yet. Seeding 5 test students first...');
      const names = ['AstroNova', 'VectorVolt', 'SigmaStar', 'ZeroGravity', 'BinaryGalaxy'];
      for (const name of names) {
        await supabase.from('students').upsert({
          room_code: roomCode,
          name: name,
          score: Math.floor(Math.random() * 100),
          streak: 1
        }, { onConflict: 'room_code,name' });
      }
      const { data } = await supabase.from('students').select('*').eq('room_code', roomCode);
      if (data) studentsToUse = data;
    }

    try {
      const possibleAnswers = ['A', 'B', 'C', 'D'];
      const currentAct = activities.find(a => a.id === selectedActivityId);
      
      const insertPromises = studentsToUse.map(st => {
        const randomChoice = currentAct && Math.random() > 0.3 ? currentAct.correctAnswer : possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];
        return supabase
          .from('submissions')
          .insert({
            room_code: roomCode,
            student_id: st.id,
            student_name: st.name,
            activity_id: selectedActivityId,
            choice: randomChoice,
            speed_ms: Math.floor(Math.random() * 8000) + 1000
          });
      });

      await Promise.all(insertPromises);
      triggerNotification(`Simulated ${studentsToUse.length} student submissions directly in database!`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('Failed to simulate submissions: ' + err.message);
    }
  };

  const handleSimulateMoodVotes = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !isDbConnected) {
      triggerNotification('Database is not connected.');
      return;
    }

    let studentsToUse = [...dbStudents];
    if (studentsToUse.length === 0) {
      triggerNotification('Creating 5 test students first...');
      const names = ['AstroNova', 'VectorVolt', 'SigmaStar', 'ZeroGravity', 'BinaryGalaxy'];
      for (const name of names) {
        await supabase.from('students').upsert({
          room_code: roomCode,
          name: name,
          score: Math.floor(Math.random() * 100),
          streak: 1
        }, { onConflict: 'room_code,name' });
      }
      const { data } = await supabase.from('students').select('*').eq('room_code', roomCode);
      if (data) studentsToUse = data;
    }

    try {
      const moods = ['understood', 'partial', 'confused'];
      const insertPromises = studentsToUse.map(st => {
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        return supabase
          .from('confusion_votes')
          .upsert({
            student_id: st.id,
            room_code: roomCode,
            status: randomMood,
            updated_at: new Date().toISOString()
          });
      });

      await Promise.all(insertPromises);
      triggerNotification(`Injected ${studentsToUse.length} student comprehension votes in database!`);
    } catch (err: any) {
      console.error(err);
      triggerNotification('Failed to insert votes: ' + err.message);
    }
  };

  // Navigation state setter
  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
  };

  const handleStartLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && teacherName.trim() && subjectName.trim()) {
      localStorage.setItem(roomCodeKey, roomCode.trim().toUpperCase());
      localStorage.setItem(teacherNameKey, teacherName.trim());
      localStorage.setItem(subjectNameKey, subjectName.trim());
      setIsLaunching(true);
      setTimeout(() => {
        setIsInitialized(true);
        setIsLaunching(false);
      }, 4500);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col justify-between selection:bg-cosmic-accent selection:text-white" id="main-frame-root">
      {/* Dynamic Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="bg-gray-950/90 backdrop-blur-xl border border-cosmic-accent/40 text-white py-3 px-4 rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.3)] flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-cosmic-neon animate-ping" />
              <p className="text-xs font-mono tracking-tight leading-normal flex-1 font-semibold">{notification}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {isLaunching ? (
          /* HBO-Level Cinematic Loading Screen with Walking Teacher */
          <div className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden z-50">
            {/* Dark Cinematic Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,1)_95%)] pointer-events-none z-10" />
            
            {/* Ambient Pulsing Glow */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[450px] h-[450px] bg-cosmic-accent/10 rounded-full blur-[100px] pointer-events-none"
            />
            
            {/* Logo and Synchronized Progress Indicator directly below */}
            <div className="flex flex-col items-center justify-center relative z-20">
              <div className="w-[300px] sm:w-[390px] flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, letterSpacing: "0.2em" }}
                  animate={{ 
                    opacity: 1,
                    scale: 1,
                    letterSpacing: "0.35em",
                  }}
                  transition={{ 
                    duration: 2,
                    ease: "easeOut"
                  }}
                  className="flex flex-col items-center w-full"
                >
                  <span className="text-3xl sm:text-4xl font-display font-black text-white tracking-[0.35em] neon-glow-violet text-center block w-full whitespace-nowrap pl-[0.35em]">
                    engage<span className="text-cosmic-neon">.</span>faculty
                  </span>
                </motion.div>

                {/* Progress track covering exactly from left of ENGAGE to right of FACULTY */}
                <div className="relative w-full h-20 mt-4 flex flex-col justify-end">
                  {/* Horizontal track line */}
                  <div className="absolute inset-x-0 h-[2px] bg-gray-900 bottom-8" />
                  
                  {/* Glowing progress line that expands and moves */}
                  <motion.div 
                    initial={{ left: "0%", width: "0%" }}
                    animate={{ width: ["0%", "100%", "0%"], left: ["0%", "0%", "100%"] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute h-[2px] bg-gradient-to-r from-transparent via-cosmic-neon to-transparent bottom-8"
                  />

                  {/* Walking Teacher icon gliding along the track */}
                  <motion.div
                    initial={{ left: "0%", opacity: 0 }}
                    animate={{ 
                      left: ["0%", "100%"],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ 
                      duration: 4.2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute bottom-8 flex flex-col items-center"
                    style={{ transform: 'translateX(-50%)' }}
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -6, 0],
                        rotate: [-6, 6, -6]
                      }}
                      transition={{ 
                        duration: 0.5, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-cosmic-accent to-indigo-500 border border-cosmic-neon/30 flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] relative mb-2"
                    >
                      <GraduationCap className="w-5 h-5 text-white" />
                    </motion.div>
                  </motion.div>
                  
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-cosmic-neon animate-pulse text-center w-full block">
                    Faculty Online
                  </span>
                </div>
              </div>

              {/* Subtext */}
              <motion.span 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="text-[9px] font-mono uppercase text-gray-500 tracking-[0.4em] pl-[0.4em] mt-4 block text-center w-full"
              >
                Synchronizing Presentation Space
              </motion.span>
            </div>
            
            <div className="absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-cosmic-accent/5 to-transparent pointer-events-none" />
          </div>
        ) : !isInitialized ? (
          /* Lobby Join Form for engage.faculty */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md w-full mx-auto glass-panel border border-cosmic-border rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(139,92,246,0.05)] bg-gray-950/40"
            id="lecture-lobby-card"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-cosmic-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-2.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cosmic-accent to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-cosmic-accent/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-display font-black text-white tracking-tight">
                engage.faculty
              </h2>
              <p className="text-xs text-gray-400 font-mono">Presenter Cockpit Control Station</p>
            </div>

            <form onSubmit={handleStartLobby} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase block">Presenter Name</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Dr. Savita"
                  className="w-full text-xs p-3 rounded-xl bg-black border border-gray-900 text-white focus:outline-none focus:border-cosmic-accent placeholder-gray-600 font-sans font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 font-mono uppercase block">Subject / Lecture Topic</label>
                <input
                  type="text"
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Quantum Astrophysics"
                  className="w-full text-xs p-3 rounded-xl bg-black border border-gray-900 text-white focus:outline-none focus:border-cosmic-accent placeholder-gray-600 font-sans font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] text-gray-500 font-mono uppercase block">Custom Room Code</label>
                  <input
                    type="text"
                    required
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="ENGAGE1"
                    maxLength={10}
                    className="w-full text-xs p-3 rounded-xl bg-black border border-gray-900 text-white focus:outline-none focus:border-cosmic-accent placeholder-gray-600 font-mono text-center tracking-widest font-black uppercase"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-cosmic-accent to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  >
                    <span>Launch</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Active Presentation Mode Layout (Presenter Cockpit renamed to Lecture Hall) */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            
            {/* 1. Header Board Panel */}
            <header className="glass-panel rounded-2xl p-4 sm:p-6 border border-cosmic-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-950/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cosmic-accent to-indigo-600 flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-display font-black text-white uppercase tracking-tight">Lecture Hall</h1>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    Topic: <strong className="text-gray-200">{subjectName}</strong> &bull; Presenter: <strong className="text-gray-200">{teacherName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="bg-gray-950/80 px-4 py-2 rounded-xl border border-gray-900 text-right shrink-0">
                  <span className="text-[9px] text-gray-500 font-mono block uppercase">Session Code</span>
                  <span className="text-base font-mono font-black text-white tracking-widest">{roomCode}</span>
                </div>

                <button
                  onClick={() => setIsInitialized(false)}
                  className="p-2.5 rounded-xl bg-gray-950 hover:bg-gray-900 border border-gray-900 text-xs text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                  title="Disconnect Session"
                >
                  Disconnect
                </button>
              </div>
            </header>

            {/* 2. Lecture Hall 10-Feature Selector (Five Circles Top, Five Circles Bottom) */}
            <nav className="glass-panel p-4 sm:p-6 rounded-2xl border border-cosmic-border bg-gray-950/40 flex flex-col items-center justify-center">
              <div className="w-full max-w-2xl mx-auto space-y-4">
                {/* Top Row: 5 Circles */}
                <div className="grid grid-cols-5 gap-2 sm:gap-4 justify-items-center">
                  {topFeatures.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleTabChange(f.id)}
                      className="flex flex-col items-center gap-1.5 focus:outline-none group cursor-pointer"
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all border ${
                        currentTab === f.id
                          ? 'bg-gradient-to-br from-cosmic-accent to-indigo-600 text-white border-cosmic-accent shadow-lg shadow-cosmic-accent/30'
                          : 'bg-gray-950 border-gray-900 text-gray-400 hover:text-white hover:border-gray-800'
                      }`}>
                        <f.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className={`text-[9px] font-mono font-bold tracking-wider uppercase text-center truncate w-14 sm:w-18 ${
                        currentTab === f.id ? 'text-white font-black' : 'text-gray-500 group-hover:text-gray-300'
                      }`}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Bottom Row: 5 Circles */}
                <div className="grid grid-cols-5 gap-2 sm:gap-4 justify-items-center">
                  {bottomFeatures.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleTabChange(f.id)}
                      className="flex flex-col items-center gap-1.5 focus:outline-none group cursor-pointer"
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all border ${
                        currentTab === f.id
                          ? 'bg-gradient-to-br from-cosmic-accent to-indigo-600 text-white border-cosmic-accent shadow-lg shadow-cosmic-accent/30'
                          : 'bg-gray-950 border-gray-900 text-gray-400 hover:text-white hover:border-gray-800'
                      }`}>
                        <f.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <span className={`text-[9px] font-mono font-bold tracking-wider uppercase text-center truncate w-14 sm:w-18 ${
                        currentTab === f.id ? 'text-white font-black' : 'text-gray-500 group-hover:text-gray-300'
                      }`}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            {/* 3. Active Tab Display Area */}
            <div className="relative">
              <AnimatePresence mode="wait">
                
                {/* A. Session Overview Tab */}
                {currentTab === 'overview' && (
                  <motion.div
                    key="overview-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch"
                  >
                    {/* Lecture Hall Details */}
                    <div className="md:col-span-8 glass-panel rounded-2xl p-8 border border-cosmic-border bg-gray-950/40 flex flex-col justify-center min-h-[250px]">
                      <span className="text-[10px] font-mono text-cosmic-neon uppercase tracking-widest block mb-2">Lecture Hall Overview</span>
                      <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight mb-2">
                        {subjectName}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                        <span>Presenter:</span>
                        <strong className="text-white font-black">{teacherName}</strong>
                      </div>
                    </div>

                    {/* Total Students in Room Card */}
                    <div className="md:col-span-4 glass-panel rounded-2xl p-6 border border-cosmic-border bg-gray-950/40 flex flex-col justify-between min-h-[250px]">
                      <div>
                        <span className="text-[10px] font-mono text-cosmic-neon uppercase tracking-widest block mb-1">
                          Audience Engagement
                        </span>
                        <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">
                          Students in Room
                        </h3>
                        
                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-5xl font-mono font-black text-white tracking-tight">
                            {dbStudents.length}
                          </span>
                          <span className="text-xs text-gray-400 font-mono uppercase">
                            Participants Connected
                          </span>
                        </div>

                        {/* Connected student list pill previews */}
                        {dbStudents.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                            {dbStudents.slice(0, 8).map((st) => (
                              <span
                                key={st.id}
                                className="text-[9px] font-mono px-2 py-0.5 rounded bg-cosmic-accent/10 border border-cosmic-accent/20 text-cosmic-neon"
                              >
                                @{st.name}
                              </span>
                            ))}
                            {dbStudents.length > 8 && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400">
                                +{dbStudents.length - 8} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 font-mono mt-3">
                            No students connected. Waiting for participants to join...
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-900/60 flex items-center justify-between gap-2">
                        <button
                          onClick={handleSimulateAddStudent}
                          className="flex-1 py-1.5 rounded-lg bg-cosmic-accent/20 hover:bg-cosmic-accent/30 text-cosmic-neon border border-cosmic-accent/35 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                        >
                          + Simulate Join
                        </button>
                        <span className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          DB LIVE
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* B. MCQ Arena Tab */}
                {currentTab === 'launcher' && (
                  <motion.div
                    key="launcher-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5">
                      <ActivityManager
                        activities={activities}
                        selectedActivityId={selectedActivityId}
                        onSelectActivity={setSelectedActivityId}
                        onCreateActivity={handleCreateActivity}
                        onDeleteActivity={handleDeleteActivity}
                        activeActivityStatus={activeActivityStatus}
                      />
                    </div>

                    <div className="lg:col-span-7">
                      <div className="glass-panel rounded-2xl p-6 border border-cosmic-border h-full flex flex-col justify-between min-h-[420px] bg-gray-950/40">
                        <div>
                          <div className="flex justify-between items-start border-b border-gray-900 pb-3 mb-4">
                            <div>
                              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                                <Play className="w-4 h-4 text-blue-400" />
                                Interactive MCQ Presenter
                              </h3>
                              <p className="text-[10px] text-gray-500 font-mono uppercase mt-0.5">Live Countdown Monitor</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${activeActivityStatus === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`} />
                              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                {activeActivityStatus === 'active' ? 'Countdown Running' : activeActivityStatus === 'revealed' ? 'Revealed' : 'Idle'}
                              </span>
                            </div>
                          </div>

                          {selectedActivityId ? (
                            (() => {
                              const currentAct = activities.find(a => a.id === selectedActivityId);
                              if (!currentAct) return null;
                              return (
                                <div className="space-y-6">
                                  <div className="bg-gray-950/60 p-5 rounded-xl border border-gray-900 text-center">
                                    <span className="text-[9px] text-blue-400 font-mono uppercase tracking-widest block mb-2">BROADCAST QUESTION</span>
                                    <h4 className="text-base font-sans font-bold text-white leading-relaxed">{currentAct.question}</h4>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {currentAct.options.map((option, idx) => {
                                      const letter = String.fromCharCode(65 + idx);
                                      const isCorrect = letter === currentAct.correctAnswer;
                                      const showColors = activeActivityStatus === 'revealed';

                                      // Real-time responses from dbSubmissions
                                      const matchingSubs = dbSubmissions.filter(s => s.activity_id === selectedActivityId && s.choice === letter);
                                      const count = matchingSubs.length;
                                      const total = dbSubmissions.filter(s => s.activity_id === selectedActivityId).length;
                                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                                      return (
                                        <div
                                          key={idx}
                                          className={`p-3.5 rounded-xl border transition-all text-xs font-medium flex flex-col items-stretch gap-2 ${
                                            showColors
                                              ? isCorrect
                                                ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                                                : 'bg-gray-950/20 border-gray-900/60 text-gray-500'
                                              : 'bg-gray-950/40 border-gray-900 text-gray-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg font-mono font-black flex items-center justify-center shrink-0 ${
                                              showColors
                                                ? isCorrect
                                                  ? 'bg-emerald-500 text-white'
                                                  : 'bg-gray-900 text-gray-600'
                                                : 'bg-gray-900 text-gray-400'
                                            }`}>
                                              {letter}
                                            </span>
                                            <span className="truncate flex-1">{option}</span>
                                            
                                            {/* Count display */}
                                            {total > 0 && (
                                              <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                                <strong>{count}</strong> ({pct}%)
                                              </span>
                                            )}
                                          </div>

                                          {/* Mini progress bar */}
                                          {total > 0 && (
                                            <div className="w-full h-1 bg-gray-950/80 rounded-full overflow-hidden mt-1">
                                              <div 
                                                className={`h-full transition-all duration-500 ${isCorrect && showColors ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ width: `${pct}%` }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="py-12 text-center text-gray-500 font-mono text-xs">
                              <HelpCircle className="w-8 h-8 mx-auto text-gray-800 mb-2" />
                              No MCQ selected. Create or select one from the list.
                            </div>
                          )}
                        </div>

                        {selectedActivityId && (
                          <div className="border-t border-gray-900 pt-4 mt-6 space-y-4">
                            {/* Live Submissions Tracker */}
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                <span>LIVE ANSWERS IN DB:</span>
                                <strong className="text-white">
                                  {dbSubmissions.filter(s => s.activity_id === selectedActivityId).length} / {dbStudents.length} Students
                                </strong>
                              </div>
                              
                              {activeActivityStatus === 'active' && (
                                <button
                                  type="button"
                                  onClick={handleSimulateMCQSubmissions}
                                  className="px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/35 text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                                >
                                  Simulate Submissions
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                              {activeActivityStatus === 'active' && (
                                <div className="w-full space-y-2">
                                  <div className="flex justify-between text-xs font-mono">
                                    <span className="text-gray-400">COUNTDOWN REMAINING:</span>
                                    <span className="text-blue-400 font-bold flex items-center gap-1 animate-pulse">
                                      <Clock className="w-4 h-4" /> {timerRemaining} seconds
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full bg-gray-950 border border-gray-900 overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000"
                                      style={{ width: `${(timerRemaining / timerDuration) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 w-full sm:w-auto justify-end">
                                {activeActivityStatus === 'idle' && (
                                  <button
                                    onClick={handleLaunchActivity}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Play className="w-4 h-4" /> Launch MCQ Timer
                                  </button>
                                )}

                                {activeActivityStatus === 'active' && (
                                  <button
                                    onClick={handleEndActivity}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-950 hover:bg-gray-900 border border-red-500/40 text-red-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <Square className="w-3.5 h-3.5" /> Force End & Reveal
                                  </button>
                                )}

                                {activeActivityStatus === 'revealed' && (
                                  <button
                                    onClick={async () => {
                                      const supabase = getSupabaseClient();
                                      if (supabase && isDbConnected) {
                                        try {
                                          await supabase
                                            .from('submissions')
                                            .delete()
                                            .eq('room_code', roomCode)
                                            .eq('activity_id', selectedActivityId);
                                        } catch (err) {
                                          console.error(err);
                                        }
                                      }
                                      setActiveActivityStatus('idle');
                                      triggerNotification('MCQ re-armed and previous DB answers cleared!');
                                    }}
                                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    Re-arm / Clear Answers
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* C. Quick Polls Tab */}
                {currentTab === 'polls' && (
                  <motion.div
                    key="polls-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <PollsManager roomCode={roomCode} isDbConnected={isDbConnected} />
                  </motion.div>
                )}

                {/* D. Flashcards Tab */}
                {currentTab === 'flashcards' && (
                  <motion.div
                    key="flashcards-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <FlashcardsArena roomCode={roomCode} isDbConnected={isDbConnected} />
                  </motion.div>
                )}

                {/* E. Concept Race Tab */}
                {currentTab === 'speedtyper' && (
                  <motion.div
                    key="speedtyper-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <SpeedTyper roomCode={roomCode} isDbConnected={isDbConnected} />
                  </motion.div>
                )}

                {/* F. Q&A Board Tab */}
                {currentTab === 'qa' && (
                  <motion.div
                    key="qa-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                  >
                    <QAArena roomCode={roomCode} isDbConnected={isDbConnected} />
                  </motion.div>
                )}

                {/* G. Mood Catcher Tab */}
                {currentTab === 'mood' && (
                  <motion.div
                    key="mood-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 text-center flex flex-col justify-between min-h-[360px]">
                      <div className="space-y-4">
                        <Smile className="w-12 h-12 text-yellow-400 mx-auto animate-bounce" />
                        <h3 className="text-lg font-display font-black text-white uppercase">Mood Catcher Console</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Listen to student feedback in real-time. Students rate their comprehension level on their live synchronized portal: 😎 Clear, 🤨 Shaky, or 😵‍💫 Lost.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl text-[10px] font-mono text-gray-500">
                        Pace indicator: Updates instantly as answers arrive
                      </div>
                    </div>

                    <div className="lg:col-span-7 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest">
                          Audience Comprehension Levels
                        </h4>
                      </div>

                      {(() => {
                        const total = moodStats.understood + moodStats.partial + moodStats.confused;
                        const pctUnderstood = total > 0 ? Math.round((moodStats.understood / total) * 100) : 0;
                        const pctPartial = total > 0 ? Math.round((moodStats.partial / total) * 100) : 0;
                        const pctConfused = total > 0 ? Math.round((moodStats.confused / total) * 100) : 0;

                        return (
                          <div className="space-y-6">
                            {/* Bar Chart representing ratios */}
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-emerald-400 font-bold">😎 UNDERSTOOD ({moodStats.understood} students)</span>
                                  <span className="text-emerald-400 font-black">{pctUnderstood}%</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-gray-950 border border-gray-900 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctUnderstood}%` }} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-yellow-400 font-bold">🤨 SHAKY ({moodStats.partial} students)</span>
                                  <span className="text-yellow-400 font-black">{pctPartial}%</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-gray-950 border border-gray-900 overflow-hidden">
                                  <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${pctPartial}%` }} />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-mono">
                                  <span className="text-rose-400 font-bold">😵‍💫 CONFUSED / LOST ({moodStats.confused} students)</span>
                                  <span className="text-rose-400 font-black">{pctConfused}%</span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-gray-950 border border-gray-900 overflow-hidden">
                                  <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${pctConfused}%` }} />
                                </div>
                              </div>
                            </div>

                            {/* Simulation Trigger */}
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleSimulateMoodVotes}
                                className="px-4 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/35 text-yellow-400 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Simulate Comprehension Votes
                              </button>
                            </div>

                            {/* Status Alert block */}
                            <div className="p-4 rounded-xl bg-gray-950 border border-gray-900 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm font-bold animate-pulse">
                                OK
                              </div>
                              <p className="text-[11px] text-gray-400 font-sans">
                                <strong>Instructor pace summary:</strong> Class comprehension is synchronized. {pctUnderstood}% of logged students reported absolute clarity. Keep going!
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {/* H. Countdown Stopwatch Tab */}
                {currentTab === 'countdown' && (
                  <motion.div
                    key="countdown-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 text-center flex flex-col justify-between min-h-[360px]">
                      <div className="space-y-4">
                        <Clock className="w-12 h-12 text-rose-500 mx-auto" />
                        <h3 className="text-lg font-display font-black text-white uppercase">Presentation Stopwatch</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Maintain lecture pacing using active stopwatch controls. Broadcast alarms and remaining limits directly to participant screens.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl text-[10px] font-mono text-gray-500">
                        Pacing alignment: Keep lecture duration on track
                      </div>
                    </div>

                    <div className="lg:col-span-7 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-4 text-center flex flex-col justify-center items-center">
                      <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest block mb-2">LECTURE SESSION TIME</span>
                      <div className="p-6 bg-gray-950 border border-gray-900 rounded-2xl font-mono text-4xl font-black text-white tracking-widest flex items-center justify-center gap-2">
                        <span>00</span> : <span>{timerRemaining > 0 ? String(timerRemaining).padStart(2, '0') : '00'}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setTimerRemaining(60);
                            triggerNotification('Set stopwatch to 60 seconds!');
                          }}
                          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                        >
                          60s
                        </button>
                        <button
                          onClick={() => {
                            setTimerRemaining(300);
                            triggerNotification('Set stopwatch to 5 minutes!');
                          }}
                          className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono text-gray-300 hover:text-white transition-all cursor-pointer"
                        >
                          5m
                        </button>
                        <button
                          onClick={() => {
                            setTimerRemaining(0);
                            triggerNotification('Reset timer.');
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* I. Leaderboard Tab */}
                {currentTab === 'leaderboard' && (
                  <motion.div
                    key="leaderboard-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 text-center flex flex-col justify-between min-h-[360px]">
                      <div className="space-y-4">
                        <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                        <h3 className="text-lg font-display font-black text-white uppercase">Participant Podium</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Celebrate learner achievements and high streaks! High scoring motivates active participation and conceptual memory recall.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl text-[10px] font-mono text-gray-500">
                        Scoring criteria: Quiz speed, spelling speed and surveys
                      </div>
                    </div>

                    <div className="lg:col-span-7 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                          Classroom Leaderboard
                        </h4>
                        <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono uppercase px-2 py-0.5 rounded font-black animate-pulse">
                          DB Live
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {dbStudents.length > 0 ? (
                          dbStudents.map((st, idx) => {
                            const isFirst = idx === 0;
                            return (
                              <div
                                key={st.id}
                                className={`p-3.5 border rounded-xl flex items-center justify-between ${
                                  isFirst
                                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30'
                                    : 'bg-gray-950 border-gray-900'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                                    isFirst ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-gray-900 text-gray-400'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className={`text-xs font-bold ${isFirst ? 'text-white' : 'text-gray-300'}`}>
                                    @{st.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className={`text-xs font-bold ${isFirst ? 'text-amber-400' : 'text-gray-400'}`}>
                                    {st.score || 0} pts
                                  </span>
                                  {st.streak > 0 && (
                                    <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Flame className="w-3 h-3 fill-orange-500 text-orange-400" /> {st.streak}x streak
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-12 text-center text-gray-500 font-mono text-xs">
                            <HelpCircle className="w-8 h-8 mx-auto text-gray-800 mb-2" />
                            No students registered in this session yet.
                            <button
                              onClick={handleSimulateAddStudent}
                              className="mt-4 block mx-auto px-4 py-2 rounded-xl bg-cosmic-accent/20 hover:bg-cosmic-accent/30 border border-cosmic-accent/30 text-cosmic-neon font-bold font-mono uppercase text-[10px] transition-all cursor-pointer"
                            >
                              + Seed Join simulated students
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* J. Resource Vault Tab */}
                {currentTab === 'resources' && (
                  <motion.div
                    key="resources-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                  >
                    <div className="lg:col-span-5 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 text-center flex flex-col justify-between min-h-[360px]">
                      <div className="space-y-4">
                        <BookOpen className="w-12 h-12 text-teal-400 mx-auto" />
                        <h3 className="text-lg font-display font-black text-white uppercase">Resource Vault</h3>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Push curated references, notes, reading materials, or external PDF links instantly to student portals during the live session.
                        </p>
                      </div>
                      <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl text-[10px] font-mono text-gray-500">
                        Broadcasting: Pushes links to live participants
                      </div>
                    </div>

                    <div className="lg:col-span-7 glass-panel p-6 border border-cosmic-border rounded-2xl bg-gray-950/40 space-y-6">
                      <h4 className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
                        Reference Dispatcher
                      </h4>

                      <div className="space-y-4 bg-gray-950/40 p-4 rounded-xl border border-gray-900/60">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Resource Title</label>
                            <input
                              type="text"
                              value={newLinkTitle}
                              onChange={(e) => setNewLinkTitle(e.target.value)}
                              placeholder="e.g. AstroPhysics Reference Sheets"
                              className="w-full text-xs p-2.5 rounded-lg bg-gray-950 border border-gray-900 text-white focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">Target URL</label>
                            <input
                              type="text"
                              value={newLinkUrl}
                              onChange={(e) => setNewLinkUrl(e.target.value)}
                              placeholder="e.g. https://example.com/notes.pdf"
                              className="w-full text-xs p-2.5 rounded-lg bg-gray-950 border border-gray-900 text-white focus:outline-none focus:border-teal-500 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          onClick={handlePushLink}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Push Reference Link
                        </button>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Broadcasting references</span>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                          {pushedLinks.map((link, idx) => (
                            <div key={idx} className="p-3 bg-gray-950 border border-gray-900 rounded-lg flex justify-between items-center text-xs font-mono">
                              <span className="text-gray-200 font-sans font-bold">{link.title}</span>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-400 hover:underline truncate max-w-[180px]"
                              >
                                {link.url}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </motion.div>
        )}

      </main>

      {isInitialized && (
        <footer className="py-4 border-t border-gray-950 text-center font-mono text-[10px] text-gray-700 bg-black">
          Lecture Hall Orchestrator &bull; Integrated Real-Time Database Sync Service
        </footer>
      )}

      {/* Floating DB Connection Status & Settings Trigger */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setShowDbConfig(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-lg transition-all cursor-pointer ${
            isDbConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : isDbConnecting
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 animate-pulse'
              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
          }`}
        >
          <Database className={`w-3.5 h-3.5 ${isDbConnecting ? 'animate-spin' : ''}`} />
          <span>ManageDB</span>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isDbConnected ? 'bg-emerald-400' : isDbConnecting ? 'bg-amber-400' : 'bg-red-400'
          }`} />
        </button>
      </div>

      {/* Database Connection / Configuration Slide-over / Modal Overlay */}
      <AnimatePresence>
        {showDbConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl bg-gray-950 border border-gray-900 rounded-3xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDbConfig(false)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isDbConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cosmic-accent/10 text-cosmic-neon'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">
                    Manage Database Connection
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Configure real-time credentials
                  </p>
                </div>
              </div>

              {/* Error Alert Block */}
              {dbError && (
                <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-2xl mb-6 text-xs text-red-300 space-y-2 font-mono">
                  <div className="flex items-center gap-2 font-bold text-red-400">
                    <Database className="w-4 h-4" />
                    <span>CONNECTION ERROR</span>
                  </div>
                  <p className="font-semibold leading-relaxed">{dbError}</p>
                </div>
              )}

              {/* Status Indicator */}
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-900/60 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[9px] text-gray-500 font-mono block uppercase">Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      isDbConnected ? 'bg-emerald-500 animate-pulse' : isDbConnecting ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
                    }`} />
                    <span className="text-xs font-mono font-bold uppercase text-white">
                      {isDbConnected ? 'CONNECTED' : isDbConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReconnectTrigger(prev => prev + 1);
                      triggerNotification('Connecting...');
                    }}
                    disabled={isDbConnecting}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] font-mono font-bold uppercase text-gray-300 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Test / Reconnect
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Restore default fallback credentials?')) {
                        clearSupabaseCredentials();
                        const fallbackCreds = getSupabaseCredentials();
                        setConfigUrl(fallbackCreds?.url || '');
                        setConfigKey(fallbackCreds?.anonKey || '');
                        setReconnectTrigger(prev => prev + 1);
                        triggerNotification('Restored defaults!');
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gray-950 hover:bg-red-950/20 border border-gray-900 hover:border-red-900/40 text-[10px] font-mono font-bold uppercase text-gray-500 hover:text-red-400 transition-all cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* Credentials Form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Supabase Project URL</label>
                  <input
                    type="text"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value.trim())}
                    placeholder="https://your-project.supabase.co"
                    className="w-full text-xs p-3 rounded-xl bg-black border border-gray-900 text-white focus:outline-none focus:border-cosmic-accent placeholder-gray-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-mono uppercase block">Supabase Anon Key (API Key)</label>
                  <input
                    type="password"
                    value={configKey}
                    onChange={(e) => setConfigKey(e.target.value.trim())}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-xs p-3 rounded-xl bg-black border border-gray-900 text-white focus:outline-none focus:border-cosmic-accent placeholder-gray-700 font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!configUrl || !configKey) {
                      triggerNotification('Please enter URL and API key!');
                      return;
                    }
                    saveSupabaseCredentials(configUrl, configKey);
                    setReconnectTrigger(prev => prev + 1);
                    triggerNotification('Saved database credentials!');
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cosmic-accent to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cosmic-accent/25"
                >
                  <Database className="w-4 h-4" /> Save Connection Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
