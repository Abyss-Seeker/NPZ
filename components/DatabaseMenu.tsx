
import React, { useState } from 'react';
import { DatabaseEntry, Difficulty } from '../types';
import { DATABASE_ENTRIES } from '../constants';
import { audioService } from '../services/audioService';

interface DatabaseMenuProps {
  unlockedEntries: string[];
  entryClears: Record<string, Difficulty[]>;
  dataFragments: number;
  onUnlock: (id: string) => void;
  onStartPractice: (entry: DatabaseEntry, difficulty: Difficulty) => void;
  onBack: () => void;
}

const DatabaseMenu: React.FC<DatabaseMenuProps> = ({ 
    unlockedEntries, entryClears, dataFragments, onUnlock, onStartPractice, onBack 
}) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [practiceDiff, setPracticeDiff] = useState<Difficulty>(Difficulty.NORMAL);

    const selectedEntry = selectedId ? DATABASE_ENTRIES.find(e => e.id === selectedId) : null;
    const isUnlocked = selectedEntry ? unlockedEntries.includes(selectedEntry.id) : false;
    
    // Check if star should be awarded (Easy, Normal, Hard, Extreme cleared)
    const hasStar = (entry: DatabaseEntry) => {
        const clears = entryClears[entry.id] || [];
        return clears.includes(Difficulty.EASY) && 
               clears.includes(Difficulty.NORMAL) && 
               clears.includes(Difficulty.HARD) && 
               clears.includes(Difficulty.EXTREME);
    };

    return (
        <div className="flex flex-col items-center h-full w-full bg-slate-950 text-slate-200 font-mono overflow-hidden p-4 md:p-8">
            <h1 className="text-4xl text-yellow-400 mb-2 font-bold tracking-widest text-center mt-4">HOSTILE DATABASE</h1>
            <div className="text-sm text-yellow-600 tracking-widest mb-8">PRACTICE SIMULATION MODULE</div>

            <div className="flex flex-grow w-full max-w-6xl gap-8 overflow-hidden">
                {/* Left: List */}
                <div className="w-1/2 overflow-y-auto border border-slate-800 bg-slate-900/50 p-4 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-2">
                        {DATABASE_ENTRIES.map(entry => {
                            const unlocked = unlockedEntries.includes(entry.id);
                            const active = selectedId === entry.id;
                            const star = hasStar(entry);
                            
                            return (
                                <button
                                    key={entry.id}
                                    onClick={() => { setSelectedId(entry.id); audioService.playUiHover(); }}
                                    className={`flex justify-between items-center p-3 border transition-all text-left ${active ? 'bg-yellow-900/30 border-yellow-500 text-yellow-200' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 ${unlocked ? (star ? 'bg-yellow-400 shadow-[0_0_5px_yellow]' : 'bg-green-500') : 'bg-red-500'}`}></div>
                                        <span className="font-bold">{entry.name}</span>
                                        {star && <span className="text-yellow-400 text-lg">★</span>}
                                    </div>
                                    {!unlocked && <span className="text-xs text-red-400 bg-red-900/20 px-2 py-0.5 rounded">LOCKED</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Details */}
                <div className="w-1/2 border border-slate-700 bg-black/80 p-6 flex flex-col relative">
                    {selectedEntry ? (
                        <>
                            <div className="absolute top-0 right-0 p-2 text-xs text-gray-600">{selectedEntry.id.toUpperCase()}</div>
                            
                            <h2 className={`text-3xl font-bold mb-2 ${isUnlocked ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedEntry.name}
                            </h2>
                            <div className="text-sm bg-slate-800 inline-block px-2 py-1 rounded text-slate-300 mb-6 self-start">
                                CLASS: {selectedEntry.type.toUpperCase()}
                            </div>

                            <div className="mb-8 text-lg text-gray-300 leading-relaxed border-l-2 border-slate-600 pl-4">
                                {selectedEntry.description}
                            </div>

                            <div className="mt-auto">
                                {!isUnlocked ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="text-yellow-500 font-bold">REQUIRED FRAGMENTS: {selectedEntry.cost}</div>
                                        <div className="text-gray-500 text-sm">CURRENT: {dataFragments}</div>
                                        <button
                                            onClick={() => onUnlock(selectedEntry.id)}
                                            disabled={dataFragments < selectedEntry.cost}
                                            className={`py-4 font-bold tracking-widest border ${dataFragments >= selectedEntry.cost ? 'bg-yellow-600 hover:bg-yellow-500 text-black border-yellow-400' : 'bg-slate-800 text-gray-500 border-slate-600 cursor-not-allowed'}`}
                                        >
                                            {dataFragments >= selectedEntry.cost ? 'UNLOCK ENTRY' : 'INSUFFICIENT DATA'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <div className="border-t border-slate-700 pt-4">
                                            <label className="block text-xs text-gray-500 mb-2">SIMULATION DIFFICULTY</label>
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                {[Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD, Difficulty.EXTREME].map(d => {
                                                    const cleared = entryClears[selectedEntry.id]?.includes(d);
                                                    const isSel = practiceDiff === d;
                                                    const label = d === Difficulty.EASY ? 'INIT' : d === Difficulty.NORMAL ? 'STD' : d === Difficulty.HARD ? 'HARD' : 'EXTR';
                                                    
                                                    return (
                                                        <button
                                                            key={d}
                                                            onClick={() => setPracticeDiff(d)}
                                                            className={`text-xs py-2 border relative ${isSel ? 'border-yellow-400 text-yellow-400 bg-yellow-900/20' : 'border-slate-700 text-gray-500 hover:border-slate-500'}`}
                                                        >
                                                            {label}
                                                            {cleared && <div className="absolute top-0 right-0 w-2 h-2 bg-green-500"></div>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => onStartPractice(selectedEntry, practiceDiff)}
                                            className="py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold tracking-widest border border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                                        >
                                            INITIATE SIMULATION
                                        </button>
                                        <p className="text-center text-[10px] text-gray-500">
                                            {selectedEntry.type === 'mob' ? 'SURVIVE FOR 60 SECONDS' : 'ELIMINATE TARGET'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-600">
                            SELECT AN ENTRY TO VIEW DETAILS
                        </div>
                    )}
                </div>
            </div>

            <button 
                onClick={onBack}
                className="mt-8 px-8 py-3 bg-slate-800 text-white border border-slate-600 hover:bg-slate-700 font-bold skew-x-[-12deg]"
            >
                <span className="skew-x-[12deg] block">RETURN TO MENU</span>
            </button>
        </div>
    );
};

export default DatabaseMenu;
