

import React, { useState } from 'react';
import { Difficulty, GameStats, AppView } from '../types';
import { audioService } from '../services/audioService';
import SettingsMenu from './SettingsMenu';

interface MainMenuProps {
  onSelectDifficulty: (d: Difficulty) => void;
  unlockedInfinity: boolean;
  clearedDifficulties: Difficulty[];
  pitySystemEnabled: boolean;
  onTogglePity: () => void;
  pityStacks: number;
  onResetPity: () => void;
  gameStats: GameStats;
  onExportSave: () => void;
  onImportSave: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeView: (view: AppView) => void;
  playerBulletAlpha: number;
  setPlayerBulletAlpha: (val: number) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ 
  onSelectDifficulty, unlockedInfinity, clearedDifficulties, 
  pitySystemEnabled, onTogglePity, pityStacks, onResetPity,
  gameStats, onExportSave, onImportSave, onChangeView,
  playerBulletAlpha, setPlayerBulletAlpha
}) => {
  const isHardUnlocked = clearedDifficulties.includes(Difficulty.NORMAL);
  const isExtremeUnlocked = clearedDifficulties.includes(Difficulty.HARD);
  
  // State for Boss Rush Difficulty Toggle
  const [bossRushExtremeMode, setBossRushExtremeMode] = useState(false);
  const [showPityDetails, setShowPityDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleResumeAudio = () => {
    audioService.resume();
  };

  const getHighestDifficultyCleared = () => {
      if (clearedDifficulties.includes(Difficulty.INFINITY)) return "SINGULARITY";
      if (clearedDifficulties.includes(Difficulty.EXTREME)) return "EXTREME";
      if (clearedDifficulties.includes(Difficulty.HARD)) return "HARD";
      if (clearedDifficulties.includes(Difficulty.NORMAL)) return "NORMAL";
      if (clearedDifficulties.includes(Difficulty.EASY)) return "EASY";
      return "NONE";
  }

  const getBestBossRush = () => {
      if (!gameStats.bestBossRush || gameStats.bestBossRush.waves === 0) return "N/A";
      const diff = gameStats.bestBossRush.difficulty === Difficulty.BOSS_RUSH_EXTREME ? "EXTREME" : "HARD";
      return `${diff} - WAVE ${gameStats.bestBossRush.waves}`;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white overflow-hidden relative" onClick={handleResumeAudio}>
       {/* Background Elements */}
       <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 border border-cyan-500 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 border-2 border-dashed border-red-500 rounded-full animate-spin-slow"></div>
       </div>

       {showSettings && (
           <SettingsMenu 
               onClose={() => setShowSettings(false)} 
               playerBulletAlpha={playerBulletAlpha}
               setPlayerBulletAlpha={setPlayerBulletAlpha}
           />
       )}

       {/* Top Left Settings & Save */}
       <div className="absolute top-8 left-8 z-20 flex gap-4">
          <button 
             onClick={(e) => { e.stopPropagation(); audioService.playUiHover(); setShowSettings(true); }}
             className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors border border-transparent hover:border-cyan-900 px-3 py-1 bg-black/50"
          >
             <div className="w-2 h-2 bg-current animate-pulse"></div>
             SYSTEM CONFIG
          </button>
          
          <button 
             onClick={(e) => { e.stopPropagation(); audioService.playUiHover(); onExportSave(); }}
             className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-green-400 transition-colors border border-transparent hover:border-green-900 px-3 py-1 bg-black/50"
          >
             SAVE DATA
          </button>
          
          <label className="flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-yellow-400 transition-colors border border-transparent hover:border-yellow-900 px-3 py-1 bg-black/50 cursor-pointer">
             LOAD DATA
             <input type="file" accept=".json" className="hidden" onChange={onImportSave} />
          </label>
       </div>

       <h1 className="text-7xl font-bold font-['Rajdhani'] tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
          NEON PROTOCOL: ZERO
       </h1>
       <p className="text-cyan-200 font-mono tracking-widest mb-12 text-sm opacity-80">
          // PROJECT STG // VERSION 1.3.0 // AUTHORIZED PERSONNEL ONLY
       </p>

       <div className="flex flex-col gap-6 w-64 z-10">
          <button 
             onMouseEnter={() => audioService.playUiHover()}
             onClick={() => onSelectDifficulty(Difficulty.EASY)}
             className="group relative px-6 py-4 bg-slate-900 border border-green-500 hover:bg-green-900/20 transition-all skew-x-[-12deg]"
          >
             <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className="block skew-x-[12deg] text-green-400 font-bold tracking-widest group-hover:translate-x-2 transition-transform">
                PROTOCOL: INIT (EASY)
             </span>
          </button>

          <button 
             onMouseEnter={() => audioService.playUiHover()}
             onClick={() => onSelectDifficulty(Difficulty.NORMAL)}
             className="group relative px-6 py-4 bg-slate-900 border border-cyan-500 hover:bg-cyan-900/20 transition-all skew-x-[-12deg]"
          >
             <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className="block skew-x-[12deg] text-cyan-400 font-bold tracking-widest group-hover:translate-x-2 transition-transform">
                PROTOCOL: STD (NORMAL)
             </span>
          </button>

          <button 
             onMouseEnter={() => isHardUnlocked && audioService.playUiHover()}
             disabled={!isHardUnlocked}
             onClick={() => onSelectDifficulty(Difficulty.HARD)}
             className={`group relative px-6 py-4 border transition-all skew-x-[-12deg] ${isHardUnlocked ? 'bg-slate-900 border-red-500 hover:bg-red-900/20 cursor-pointer' : 'bg-slate-950 border-slate-800 cursor-not-allowed opacity-50'}`}
          >
             <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className={`block skew-x-[12deg] font-bold tracking-widest ${isHardUnlocked ? 'text-red-400 group-hover:translate-x-2' : 'text-slate-600'}`}>
                {isHardUnlocked ? 'PROTOCOL: HELL (HARD)' : 'LOCKED (CLEAR NORMAL)'}
             </span>
          </button>

          <button 
             onMouseEnter={() => isExtremeUnlocked && audioService.playUiHover()}
             disabled={!isExtremeUnlocked}
             onClick={() => onSelectDifficulty(Difficulty.EXTREME)}
             className={`group relative px-6 py-4 border transition-all skew-x-[-12deg] ${isExtremeUnlocked ? 'bg-slate-900 border-fuchsia-600 hover:bg-fuchsia-900/20 cursor-pointer' : 'bg-slate-950 border-slate-800 cursor-not-allowed opacity-50'}`}
          >
             <div className="absolute top-0 right-0 w-2 h-2 bg-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className={`block skew-x-[12deg] font-bold tracking-widest ${isExtremeUnlocked ? 'text-fuchsia-400 group-hover:translate-x-2' : 'text-slate-600'}`}>
                {isExtremeUnlocked ? 'PROTOCOL: ARMGDN (EXTREME)' : 'LOCKED (CLEAR HARD)'}
             </span>
          </button>

          <button 
             onMouseEnter={() => unlockedInfinity && audioService.playUiHover()}
             disabled={!unlockedInfinity}
             onClick={() => onSelectDifficulty(Difficulty.INFINITY)}
             className={`group relative px-6 py-4 border transition-all skew-x-[-12deg] ${unlockedInfinity ? 'bg-slate-900 border-purple-500 hover:bg-purple-900/20 cursor-pointer' : 'bg-slate-950 border-slate-800 cursor-not-allowed opacity-50'}`}
          >
             <span className={`block skew-x-[12deg] font-bold tracking-widest ${unlockedInfinity ? 'text-purple-400 group-hover:translate-x-2' : 'text-slate-600'}`}>
                {unlockedInfinity ? 'PROTOCOL: SINGULARITY (INF)' : 'LOCKED (CLEAR ALL)'}
             </span>
          </button>
       </div>

       {/* Left Panel: Stats */}
       <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 flex flex-col items-start gap-2 border-l-4 border-blue-800 pl-6 py-10 z-10 bg-gradient-to-r from-blue-950/20 to-transparent w-72">
          
          <button 
             onClick={() => onChangeView(AppView.DATABASE)}
             onMouseEnter={() => audioService.playUiHover()}
             className="text-yellow-400 font-bold tracking-[0.2em] mb-4 text-xl border-b border-yellow-500 pb-1 w-full text-left hover:text-yellow-200 transition-colors"
          >
             DATABASE (PRACTICE)
          </button>
          
          <button 
             onClick={() => setShowStats(!showStats)}
             onMouseEnter={() => audioService.playUiHover()}
             className="text-blue-400 font-bold tracking-[0.2em] mb-4 text-xl border-b border-blue-500 pb-1 w-full text-left"
          >
             COMBAT RECORDS {showStats ? '[-]' : '[+]'}
          </button>
          
          <div className={`w-full font-mono text-sm text-gray-300 transition-all duration-300 ease-in-out overflow-hidden ${showStats ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3 py-2">
                  <div className="flex justify-between">
                     <span>SORTIES FLOWN:</span>
                     <span className="text-cyan-400">{gameStats.totalGamesPlayed}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>HOSTILES SILENCED:</span>
                     <span className="text-red-400">{gameStats.totalKills}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>BOSSES TERMINATED:</span>
                     <span className="text-red-500 font-bold">{gameStats.bossesKilled}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>HULL FAILURES:</span>
                     <span className="text-gray-500">{gameStats.totalDeaths}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>PROJECTILES FIRED:</span>
                     <span className="text-yellow-200">{gameStats.totalShotsFired.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>DATA MINED:</span>
                     <span className="text-yellow-400">{gameStats.totalFragmentsCollected.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-blue-900 my-1"></div>
                  <div className="flex justify-between">
                     <span>MAX DIFFICULTY:</span>
                     <span className="text-white">{getHighestDifficultyCleared()}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>MAX BOSS RUSH:</span>
                     <span className="text-white">{getBestBossRush()}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>HIGH SCORE:</span>
                     <span className="text-green-400">{gameStats.highestScore.toLocaleString()}</span>
                  </div>
              </div>
          </div>
          {!showStats && <div className="text-xs text-gray-600 transition-opacity duration-300">Click to expand records...</div>}
       </div>

       {/* Right Panel for Boss Rush */}
       <div className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 flex flex-col items-end gap-2 border-r-4 border-red-800 pr-6 py-10 z-10 bg-gradient-to-l from-red-950/20 to-transparent">
          <div className="text-red-500 font-bold tracking-[0.2em] mb-4 text-xl border-b border-red-500 pb-1">
             SPECIAL OPERATIONS
          </div>
          
          {isExtremeUnlocked && (
             <div className="flex gap-2 mb-2">
                 <button 
                    onMouseEnter={() => audioService.playUiHover()}
                    onClick={() => setBossRushExtremeMode(false)}
                    className={`px-3 py-1 text-xs border ${!bossRushExtremeMode ? 'bg-red-600 text-white border-red-400' : 'bg-transparent text-gray-500 border-gray-700'}`}
                 >
                    HARD
                 </button>
                 <button 
                    onMouseEnter={() => audioService.playUiHover()}
                    onClick={() => setBossRushExtremeMode(true)}
                    className={`px-3 py-1 text-xs border ${bossRushExtremeMode ? 'bg-fuchsia-600 text-white border-fuchsia-400' : 'bg-transparent text-gray-500 border-gray-700'}`}
                 >
                    EXTREME
                 </button>
             </div>
          )}

          <button 
             onMouseEnter={() => audioService.playUiHover()}
             onClick={() => onSelectDifficulty(bossRushExtremeMode ? Difficulty.BOSS_RUSH_EXTREME : Difficulty.BOSS_RUSH)}
             className={`group relative px-8 py-6 border-2 transition-all hover:scale-105 ${bossRushExtremeMode ? 'bg-fuchsia-950/40 border-fuchsia-600 hover:bg-fuchsia-900/60' : 'bg-red-950/40 border-red-600 hover:bg-red-900/60'}`}
          >
             <div className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 ${bossRushExtremeMode ? 'border-fuchsia-400' : 'border-red-400'}`}></div>
             <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 ${bossRushExtremeMode ? 'border-fuchsia-400' : 'border-red-400'}`}></div>
             <span className={`block font-['Rajdhani'] text-2xl font-bold tracking-widest mb-1 ${bossRushExtremeMode ? 'text-fuchsia-100' : 'text-red-100'}`}>
                {bossRushExtremeMode ? 'BOSS RUSH: EXTREME' : 'BOSS RUSH MODE'}
             </span>
             <span className={`block text-xs font-mono ${bossRushExtremeMode ? 'text-fuchsia-400' : 'text-red-400'}`}>
                {bossRushExtremeMode ? '15 WAVES // NIGHTMARE // 2X LOOT' : '15 WAVES // HARD // 2X LOOT'}
             </span>
          </button>
       </div>

       {/* Pity System Panel */}
       <div className="absolute left-8 md:left-16 bottom-10 z-10 w-80">
          <div 
             className={`border p-4 bg-slate-900/90 transition-all cursor-pointer ${pitySystemEnabled ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-slate-700 grayscale opacity-70'}`}
             onMouseEnter={() => audioService.playUiHover()}
             onClick={() => setShowPityDetails(!showPityDetails)}
          >
             <div className="flex justify-between items-center mb-2">
                <span className={`font-bold font-mono tracking-wider ${pitySystemEnabled ? 'text-yellow-400' : 'text-slate-400'}`}>
                   TACTICAL SUPPORT
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${pitySystemEnabled ? 'bg-yellow-900 text-yellow-300' : 'bg-slate-800 text-slate-500'}`}>
                   {pitySystemEnabled ? 'ONLINE' : 'OFFLINE'}
                </span>
             </div>
             
             {showPityDetails && (
                 <div className="mt-2 space-y-2 text-xs font-mono text-slate-300">
                    <div className="flex justify-between">
                       <span>DEATH COUNT (STACKS):</span>
                       <span className="text-yellow-400 font-bold">{pityStacks} / 100</span>
                    </div>
                    <div className="h-px bg-slate-700 my-2"></div>
                    <div className="space-y-1">
                       <div className="flex justify-between"><span>MVMT SPEED:</span> <span className="text-blue-400">+0%</span></div>
                       <div className="flex justify-between"><span>HULL INTEGRITY (HP):</span> <span className="text-green-400">+{pityStacks * 5}%</span></div>
                       <div className="flex justify-between"><span>WEAPON DAMAGE:</span> <span className="text-red-400">+{pityStacks * 2}%</span></div>
                       <div className="flex justify-between"><span>COOLDOWN RATE:</span> <span className="text-purple-400">+{pityStacks * 2}%</span></div>
                    </div>
                    <div className="mt-4 flex gap-2">
                       <button 
                          onClick={(e) => { e.stopPropagation(); onTogglePity(); }}
                          className={`flex-1 py-2 text-center border font-bold hover:opacity-80 transition ${pitySystemEnabled ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}
                       >
                          {pitySystemEnabled ? 'DISABLE' : 'ENABLE'}
                       </button>
                       <button 
                          onClick={(e) => { e.stopPropagation(); onResetPity(); }}
                          className="flex-1 py-2 text-center border border-slate-500 text-slate-400 hover:bg-slate-800 transition"
                       >
                          RESET
                       </button>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 italic">
                       * Stacks reset upon difficulty completion.
                    </div>
                 </div>
             )}
             {!showPityDetails && (
                 <div className="text-xs text-slate-500">Click to configure support protocols...</div>
             )}
          </div>
       </div>

       <div className="mt-16 text-slate-600 text-xs font-mono">
          CONTROLS: ARROWS/WASD (MOVE) | Z/SPACE (SHOOT) | X/C/V (SPELL) | SHIFT (FOCUS) | ESC (PAUSE)
       </div>
    </div>
  );
};

export default MainMenu;
