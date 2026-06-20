import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Laptop, Play, BarChart3, Brain, Target, MessageSquare, 
  Smile, Clock, Trophy, BookOpen, LucideIcon
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Laptop,
    color: 'from-cyan-500 to-blue-600',
    description: 'Master central cockpit and status board'
  },
  {
    id: 'launcher',
    label: 'MCQ Arena',
    icon: Play,
    color: 'from-blue-500 to-indigo-600',
    description: 'Broadcast active-countdown multiple choice questions'
  },
  {
    id: 'polls',
    label: 'Quick Polls',
    icon: BarChart3,
    color: 'from-emerald-500 to-teal-600',
    description: 'Instant surveys and live opinion graphs'
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: Brain,
    color: 'from-fuchsia-500 to-pink-600',
    description: 'Active recall and conceptual slide decks'
  },
  {
    id: 'speedtyper',
    label: 'Concept Race',
    icon: Target,
    color: 'from-orange-500 to-red-600',
    description: 'Live interactive spelling and recall speed test'
  },
  {
    id: 'qa',
    label: 'Q&A Board',
    icon: MessageSquare,
    color: 'from-sky-500 to-indigo-600',
    description: 'Moderate anonymous learner inquiries in real time'
  },
  {
    id: 'mood',
    label: 'Mood Catcher',
    icon: Smile,
    color: 'from-yellow-400 to-orange-500',
    description: 'Track audience comprehension levels and fatigue'
  },
  {
    id: 'countdown',
    label: 'Countdown',
    icon: Clock,
    color: 'from-rose-500 to-pink-600',
    description: 'Professional stage timer and progress stopwatch'
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    color: 'from-amber-400 to-yellow-600',
    description: 'Celebrate top participants and achievement streaks'
  },
  {
    id: 'resources',
    label: 'Resource Vault',
    icon: BookOpen,
    color: 'from-teal-400 to-emerald-600',
    description: 'Push curated links and reference books to students'
  }
];

interface CircularMenuProps {
  currentTab: string;
  onChangeTab: (tabId: any) => void;
}

export default function CircularMenu({ currentTab, onChangeTab }: CircularMenuProps) {
  const activeIdx = MENU_ITEMS.findIndex((item) => item.id === currentTab);
  const safeActiveIdx = activeIdx === -1 ? 0 : activeIdx;

  // We want the active item to be at the top (which is -90 degrees or angle=270).
  // Each item is placed at i * 36 degrees.
  // To rotate the active item to the top (270 degrees), we rotate the whole wheel by:
  // -90 - (i * 36) degrees.
  const rotationAngle = -90 - safeActiveIdx * 36;

  return (
    <div className="flex flex-col items-center justify-center py-6 font-sans select-none" id="circular-menu-container">
      
      {/* Outer Ring / Stage */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center bg-gray-950/20 rounded-full border border-gray-900/40 p-4 shadow-[0_0_50px_rgba(124,58,237,0.03)] overflow-hidden">
        
        {/* Glow behind center */}
        <div className="absolute w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        {/* Rotating Wheel Container */}
        <motion.div
          animate={{ rotate: rotationAngle }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          className="relative w-full h-full rounded-full border border-gray-900/50 flex items-center justify-center"
          style={{ transformOrigin: 'center center' }}
        >
          {MENU_ITEMS.map((item, idx) => {
            const angle = idx * 36; // 360 / 10 = 36
            const isSelected = item.id === currentTab;

            // Compute positions on a 130px radius circle (155px for larger desktop screens)
            const radius = 135; // px
            const rad = (angle * Math.PI) / 180;
            const tx = radius * Math.cos(rad);
            const ty = radius * Math.sin(rad);

            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center border transition-all cursor-pointer group shadow-lg ${
                  isSelected
                    ? 'bg-gradient-to-br text-white border-transparent z-20 scale-110 shadow-indigo-500/20'
                    : 'bg-gray-950/90 hover:bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:scale-105 z-10'
                }`}
                style={{
                  left: `calc(50% - 24px + ${tx}px)`,
                  top: `calc(50% - 24px + ${ty}px)`,
                  transformOrigin: 'center center',
                }}
                // Cancel out the rotation of the parent wheel so icons stay upright!
                animate={{ rotate: -angle - rotationAngle }}
                transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                title={item.label}
              >
                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-full`} />
                
                {/* Active gradient border */}
                {isSelected && (
                  <div className={`absolute -inset-[1px] rounded-full bg-gradient-to-br ${item.color} -z-10 animate-pulse`} />
                )}

                <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Static Inner Hub */}
        <div className="absolute w-36 h-36 rounded-full bg-gray-950/95 border border-gray-900 shadow-2xl flex flex-col items-center justify-center p-3 text-center pointer-events-none z-30">
          <AnimatePresence mode="wait">
            {(() => {
              const activeItem = MENU_ITEMS[safeActiveIdx];
              const Icon = activeItem.icon;
              return (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeItem.color} flex items-center justify-center text-white mb-1 shadow-md shadow-indigo-500/10`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">FEATURE {safeActiveIdx + 1}/10</span>
                  <span className="text-xs font-display font-black text-white tracking-wide uppercase truncate max-w-[110px]">{activeItem.label}</span>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* Feature Description below */}
      <div className="text-center mt-4 max-w-sm px-4">
        <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
          {MENU_ITEMS[safeActiveIdx].label}
        </h4>
        <p className="text-[11px] text-gray-400 mt-1 font-sans leading-relaxed">
          {MENU_ITEMS[safeActiveIdx].description}
        </p>
      </div>

    </div>
  );
}
