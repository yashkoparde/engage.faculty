import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Brain, HelpCircle, Eye, ArrowRight } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
}

const FLASHCARDS: Flashcard[] = [
  {
    id: 'fc-1',
    topic: 'Quantum Physics',
    front: 'What is Quantum Superposition?',
    back: 'The principle that a physical system exists partly in all theoretically possible states simultaneously until it is measured or observed.'
  },
  {
    id: 'fc-2',
    topic: 'Astrophysics',
    front: 'Define the "Event Horizon" of a Black Hole.',
    back: 'The boundary surrounding a black hole from which no radiation or matter can escape, because the gravitational pull is stronger than light speed.'
  },
  {
    id: 'fc-3',
    topic: 'TypeScript Core',
    front: 'What are TypeScript Utility Types?',
    back: 'Built-in types (like Partial, Omit, Readonly) that provide convenient type transformations to manipulate and construct existing types easily.'
  },
  {
    id: 'fc-4',
    topic: 'Quantum Computing',
    front: 'Explain "Quantum Entanglement".',
    back: 'A physical phenomenon that occurs when a group of particles are generated or interact such that the state of each particle cannot be described independently.'
  }
];

export default function FlashcardsArena({ roomCode, isDbConnected }: { roomCode: string; isDbConnected: boolean }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const card = FLASHCARDS[currentIdx];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev + 1) % FLASHCARDS.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans" id="flashcards-arena-root">
      <div className="text-center space-y-2 mb-4">
        <h3 className="font-display font-black text-xl text-white uppercase tracking-wider flex items-center justify-center gap-2">
          <Brain className="w-5 h-5 text-fuchsia-400" />
          Active Recall Hub
        </h3>
        <p className="text-xs text-gray-400 font-mono">Present and review core concepts with active recall flashcards</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] text-fuchsia-400 font-mono uppercase tracking-wider bg-fuchsia-500/10 border border-fuchsia-500/20 px-2.5 py-0.5 rounded-full">
            {card.topic}
          </span>
          <span className="text-xs font-mono text-gray-500">
            Card {currentIdx + 1} of {FLASHCARDS.length}
          </span>
        </div>

        {/* 3D Card Container */}
        <div 
          className="w-full h-80 cursor-pointer perspective-1000 group relative"
          onClick={handleFlip}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="w-full h-full duration-500 transform-style-3d relative"
          >
            {/* Card Front */}
            <div className="absolute inset-0 w-full h-full backface-hidden glass-panel border border-cosmic-border rounded-2xl p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(217,70,239,0.05)] bg-gray-950/40">
              <div className="flex justify-between items-start">
                <HelpCircle className="w-8 h-8 text-fuchsia-500/60" />
                <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">ACTIVE RECALL QUESTION</span>
              </div>
              <div className="text-center px-4 py-2">
                <h3 className="font-display font-black text-2xl text-white leading-relaxed select-none">
                  {card.front}
                </h3>
              </div>
              <div className="text-center text-[10px] font-mono text-fuchsia-400/80 uppercase tracking-wider flex items-center justify-center gap-1.5 hover:text-fuchsia-300">
                <Eye className="w-3.5 h-3.5" /> Click Card to Flip and Reveal Answer
              </div>
            </div>

            {/* Card Back */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden transform rotate-y-180 glass-panel border border-fuchsia-500/35 bg-fuchsia-950/10 rounded-2xl p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(217,70,239,0.15)]"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex justify-between items-start">
                <Brain className="w-8 h-8 text-fuchsia-400" />
                <span className="text-[9px] text-fuchsia-400 font-mono uppercase tracking-widest">CONCEPT EXPLANATION</span>
              </div>
              <div className="px-4 py-2">
                <p className="text-base font-sans font-medium text-gray-100 leading-relaxed text-center select-none">
                  {card.back}
                </p>
              </div>
              <div className="text-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Click Card to flip back to question
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex gap-4 max-w-md mx-auto pt-4">
        <button
          onClick={handleFlip}
          className="flex-1 py-3 rounded-xl bg-gray-950 border border-gray-800 hover:border-gray-700 text-xs font-mono font-bold uppercase tracking-wider text-gray-300 transition-colors cursor-pointer"
        >
          Flip Card
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(217,70,239,0.2)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          Next Concept <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
