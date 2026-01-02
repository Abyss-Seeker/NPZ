

import React, { useState } from 'react';
import { audioService } from '../services/audioService';

interface SettingsMenuProps {
  onClose: () => void;
  playerBulletAlpha?: number;
  setPlayerBulletAlpha?: (val: number) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose, playerBulletAlpha = 1.0, setPlayerBulletAlpha }) => {
  // Local state to force re-renders on slider change
  const [masterVol, setMasterVol] = useState(audioService.masterVolume);
  const [musicVol, setMusicVol] = useState(audioService.musicVolume);
  const [sfxVol, setSfxVol] = useState(audioService.sfxVolume);
  const [bulletAlpha, setBulletAlpha] = useState(playerBulletAlpha);

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    audioService.masterVolume = val;
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVol(val);
    audioService.musicVolume = val;
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVol(val);
    audioService.sfxVolume = val;
    // Play a test sound to gauge volume
    if (Math.random() > 0.8) audioService.playUiHover(); 
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setBulletAlpha(val);
      if (setPlayerBulletAlpha) setPlayerBulletAlpha(val);
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
      <div className="bg-slate-900 border-2 border-cyan-600 p-8 w-96 transform skew-x-[-5deg] shadow-[0_0_30px_rgba(0,240,255,0.2)]">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6 tracking-widest text-center border-b border-cyan-800 pb-2 skew-x-[5deg]">
          SYSTEM CONFIG
        </h2>
        
        <div className="space-y-6 skew-x-[5deg]">
          {/* Master */}
          <div>
            <div className="flex justify-between text-xs text-cyan-200 mb-1 font-mono">
              <span>MASTER OUTPUT</span>
              <span>{Math.round(masterVol * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={masterVol}
              onChange={handleMasterChange}
              className="w-full accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Music */}
          <div>
            <div className="flex justify-between text-xs text-purple-300 mb-1 font-mono">
              <span>MUSIC SYNC</span>
              <span>{Math.round(musicVol * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="1" step="0.05" 
              value={musicVol}
              onChange={handleMusicChange}
              className="w-full accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* SFX */}
          <div>
            <div className="flex justify-between text-xs text-yellow-300 mb-1 font-mono">
              <span>SFX MODULE</span>
              <span>{Math.round(sfxVol * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="2" step="0.1" 
              value={sfxVol}
              onChange={handleSfxChange}
              className="w-full accent-yellow-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Bullet Visibility */}
          {setPlayerBulletAlpha && (
            <div>
                <div className="flex justify-between text-xs text-green-300 mb-1 font-mono">
                    <span>PLAYER BULLET VISIBILITY</span>
                    <span>{Math.round(bulletAlpha * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.1" max="1" step="0.05" 
                    value={bulletAlpha}
                    onChange={handleAlphaChange}
                    className="w-full accent-green-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
          )}

          <button 
             onClick={onClose}
             className="w-full mt-4 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-white font-bold transition-colors"
          >
             CLOSE CONFIG
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;
