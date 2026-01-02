

import React, { useState, useEffect, useRef } from 'react';
import { WeaponId, SpellCardId, BoosterId, StatBlock, WeaponDef, SpellCardDef } from '../types';
import { WEAPONS, SPELL_CARDS, BOOSTERS } from '../constants';
import { audioService } from '../services/audioService';

interface LoadoutMenuProps {
  unlockedWeapons: WeaponId[];
  unlockedSpells: SpellCardId[];
  weaponLevels: Record<WeaponId, number>;
  spellLevels: Record<SpellCardId, number>;
  dataFragments: number;
  maxWeaponSlots: number;
  maxSpellSlots: number;
  activeBoosters: Set<BoosterId>;
  lastLoadout: { weapons: WeaponId[], spells: SpellCardId[] } | null;
  onStart: (weapons: WeaponId[], spells: SpellCardId[]) => void;
  onUnlockWeapon: (id: WeaponId) => void;
  onUnlockSpell: (id: SpellCardId) => void;
  onUpgradeWeapon: (id: WeaponId) => void;
  onUpgradeSpell: (id: SpellCardId) => void;
  onUpgradeSlot: (type: 'weapon' | 'spell') => void;
  onBuyBooster: (id: BoosterId) => void;
  onBack: () => void;
  practiceMode?: boolean;
  practiceTarget?: string;
}

const LoadoutMenu: React.FC<LoadoutMenuProps> = ({ 
  unlockedWeapons, unlockedSpells, weaponLevels, spellLevels, dataFragments, maxWeaponSlots, maxSpellSlots, activeBoosters, lastLoadout,
  onStart, onUnlockWeapon, onUnlockSpell, onUpgradeWeapon, onUpgradeSpell, onUpgradeSlot, onBuyBooster, onBack, practiceMode, practiceTarget 
}) => {
  const [selectedWeapons, setSelectedWeapons] = useState<WeaponId[]>(lastLoadout?.weapons || [WeaponId.PLASMA_CUTTER]);
  const [selectedSpells, setSelectedSpells] = useState<SpellCardId[]>(lastLoadout?.spells || []);
  const [showShop, setShowShop] = useState(false);
  
  // Tooltip State
  const [hoveredItem, setHoveredItem] = useState<{ id: string, type: 'weapon' | 'spell', x: number, y: number } | null>(null);

  const effectiveMaxWeaponSlots = maxWeaponSlots + (activeBoosters.has(BoosterId.EXTRA_WEAPON) ? 1 : 0);
  const effectiveMaxSpellSlots = maxSpellSlots + (activeBoosters.has(BoosterId.EXTRA_SPELL) ? 1 : 0);

  useEffect(() => {
    // Ensure selection fits in effective slots
    if (selectedWeapons.length > effectiveMaxWeaponSlots) {
       setSelectedWeapons(selectedWeapons.slice(0, effectiveMaxWeaponSlots));
    }
    if (selectedSpells.length > effectiveMaxSpellSlots) {
       setSelectedSpells(selectedSpells.slice(0, effectiveMaxSpellSlots));
    }
  }, [effectiveMaxWeaponSlots, effectiveMaxSpellSlots]);

  const toggleWeapon = (id: WeaponId) => {
    if (selectedWeapons.includes(id)) {
      if (selectedWeapons.length > 1) setSelectedWeapons(prev => prev.filter(w => w !== id));
    } else {
      if (selectedWeapons.length < effectiveMaxWeaponSlots) setSelectedWeapons(prev => [...prev, id]);
    }
  };

  const toggleSpell = (id: SpellCardId) => {
    if (selectedSpells.includes(id)) {
      setSelectedSpells(prev => prev.filter(s => s !== id));
    } else {
      if (selectedSpells.length < effectiveMaxSpellSlots) setSelectedSpells(prev => [...prev, id]);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, id: string, type: 'weapon' | 'spell') => {
    audioService.playUiHover();
    setHoveredItem({ id, type, x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredItem) {
        setHoveredItem(prev => prev ? ({ ...prev, x: e.clientX, y: e.clientY }) : null);
    }
  }

  const isWeaponUnlocked = (id: WeaponId) => unlockedWeapons.includes(id);
  const isSpellUnlocked = (id: SpellCardId) => unlockedSpells.includes(id);

  const weaponUpgradeCost = maxWeaponSlots === 2 ? 1000 : 2000;
  const spellUpgradeCost = 1500;

  const renderTooltip = () => {
    if (!hoveredItem) return null;
    
    const def = hoveredItem.type === 'weapon' ? WEAPONS[hoveredItem.id as WeaponId] : SPELL_CARDS[hoveredItem.id as SpellCardId];
    if (!def) return null;

    const currentLevel = hoveredItem.type === 'weapon' 
        ? weaponLevels[hoveredItem.id as WeaponId] || 1
        : spellLevels[hoveredItem.id as SpellCardId] || 1;

    return (
        <div 
            className="fixed z-50 pointer-events-none bg-black/90 border border-cyan-500 p-4 rounded shadow-[0_0_20px_rgba(0,240,255,0.3)] w-72 backdrop-blur-md"
            style={{ 
                left: Math.min(window.innerWidth - 300, hoveredItem.x + 20), 
                top: Math.min(window.innerHeight - 300, hoveredItem.y + 20) 
            }}
        >
            <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
                <span className="font-bold text-cyan-400 font-mono text-lg">{def.name}</span>
                <span className="text-xs bg-gray-800 px-1 rounded text-gray-300">{hoveredItem.type === 'weapon' ? 'WEAPON' : 'TACTICAL'}</span>
            </div>
            
            <div className="mb-3 text-sm text-gray-300 italic leading-tight">
                {def.description}
            </div>

            <div className="space-y-2 mb-4">
                {def.stats.map((stat, idx) => (
                    <div key={idx} className="flex items-center text-xs font-mono">
                        <span className="w-10 text-gray-400 font-bold">{stat.label}</span>
                        <div className="flex-grow h-2 bg-gray-800 rounded-sm mx-2 overflow-hidden">
                            <div 
                                className="h-full rounded-sm transition-all duration-300" 
                                style={{ width: `${stat.value * 10}%`, backgroundColor: stat.color }}
                            />
                        </div>
                        <span className="w-12 text-right text-white">{stat.text}</span>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className={`text-xs ${currentLevel >= 2 ? 'text-green-400' : 'text-gray-600'}`}>
                   <span className="font-bold">LV.2:</span> {def.upgrades.lv2.description}
                </div>
                <div className={`text-xs ${currentLevel >= 3 ? 'text-yellow-400' : 'text-gray-600'}`}>
                   <span className="font-bold">LV.3:</span> {def.upgrades.lv3.description}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col items-center h-full w-full bg-slate-950 text-slate-200 font-mono overflow-y-auto overflow-x-hidden p-4 md:p-8" onMouseMove={handleMouseMove}>
      <div className="w-full max-w-6xl flex flex-col items-center pb-20">
        <h1 className="text-4xl text-cyan-400 mb-2 font-bold tracking-widest text-center mt-4">
            {practiceMode ? 'SIMULATION PREP' : 'LOADOUT CONFIG'}
        </h1>
        {practiceMode && (
             <div className="text-yellow-400 font-bold tracking-widest mb-4 border border-yellow-600 px-4 py-1 bg-yellow-900/30">
                 TARGET: {practiceTarget}
             </div>
        )}

        <div className="mb-6 flex items-center gap-4">
           <div className="text-yellow-400 font-bold text-xl">DATA FRAGMENTS: {dataFragments}</div>
           {!practiceMode && (
             <button 
                onMouseEnter={() => audioService.playUiHover()}
                onClick={() => setShowShop(!showShop)}
                className={`px-4 py-2 text-sm font-bold border skew-x-[-12deg] ${showShop ? 'bg-green-600 text-white border-green-400' : 'bg-slate-800 text-green-400 border-green-500 hover:bg-green-900/30'}`}
             >
                <span className="skew-x-[12deg] block">{showShop ? 'HIDE SHOP' : 'BLACK MARKET'}</span>
             </button>
           )}
        </div>

        {showShop && !practiceMode && (
           <div className="w-full mb-8 border border-green-900 bg-green-950/20 p-6 rounded">
              <div className="text-red-400 text-xs font-bold text-center mb-4 uppercase tracking-widest border border-red-900 bg-red-950/30 p-2">
                 Warning: Black Market acquisitions are single-use protocols. Consumed upon mission termination.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.values(BOOSTERS).map(b => (
                     <div 
                        key={b.id} 
                        className="border border-green-800 bg-slate-900 p-4 flex flex-col justify-between"
                        onMouseEnter={() => audioService.playUiHover()}
                     >
                        <div>
                           <div className="text-green-400 font-bold">{b.name}</div>
                           <div className="text-xs text-gray-400 my-1">{b.description}</div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                           <span className="text-yellow-400 text-sm">{b.cost} DF</span>
                           {activeBoosters.has(b.id) ? (
                              <span className="text-green-500 font-bold text-xs">PURCHASED</span>
                           ) : (
                              <button
                                 onClick={() => onBuyBooster(b.id)}
                                 disabled={dataFragments < b.cost}
                                 className={`px-3 py-1 text-xs border ${dataFragments >= b.cost ? 'bg-green-700 text-white border-green-500 hover:bg-green-600' : 'bg-slate-800 text-gray-500 border-slate-700 cursor-not-allowed'}`}
                              >
                                 BUY
                              </button>
                           )}
                        </div>
                     </div>
                  ))}
              </div>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {/* Weapon Selection */}
          <div className="border border-slate-700 p-4 md:p-6 bg-slate-900/50 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h2 className="text-xl text-cyan-500">PRIMARY ARMAMENT [{selectedWeapons.length}/{effectiveMaxWeaponSlots}]</h2>
              {maxWeaponSlots < 4 && !practiceMode && (
                <button 
                  onMouseEnter={() => audioService.playUiHover()}
                  onClick={() => onUpgradeSlot('weapon')}
                  disabled={dataFragments < weaponUpgradeCost}
                  className={`text-xs px-2 py-1 border ${dataFragments >= weaponUpgradeCost ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30' : 'border-slate-700 text-slate-600'}`}
                >
                  + SLOT ({weaponUpgradeCost})
                </button>
              )}
            </div>
            
            <div className="space-y-3 flex-grow">
              {Object.values(WEAPONS).map(w => {
                 const level = weaponLevels[w.id];
                 const nextUpgrade = level === 1 ? w.upgrades.lv2 : level === 2 ? w.upgrades.lv3 : null;
                 
                 return (
                  <div 
                    key={w.id} 
                    className={`flex flex-col p-3 border transition-colors ${selectedWeapons.includes(w.id) ? 'border-cyan-400 bg-cyan-900/20' : 'border-slate-800 bg-slate-900'}`}
                    onMouseEnter={(e) => handleMouseEnter(e, w.id, 'weapon')}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-2 flex-grow">
                        <div className={`font-bold flex items-center gap-2 ${isWeaponUnlocked(w.id) ? 'text-white' : 'text-gray-600'}`}>
                           {w.name}
                           {isWeaponUnlocked(w.id) && <span className="text-xs text-cyan-300 border border-cyan-800 px-1">LV.{level}</span>}
                        </div>
                        {/* Short description still shown in list, but tooltip has full details */}
                        <div className="text-xs text-gray-400 leading-tight line-clamp-1">{w.description}</div>
                      </div>
                      
                      {isWeaponUnlocked(w.id) ? (
                        <button 
                          onClick={() => toggleWeapon(w.id)}
                          className={`px-3 py-1 text-sm min-w-[80px] cursor-pointer transition-all ${selectedWeapons.includes(w.id) ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-slate-700 hover:bg-slate-600'} ${!selectedWeapons.includes(w.id) && selectedWeapons.length >= effectiveMaxWeaponSlots ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!selectedWeapons.includes(w.id) && selectedWeapons.length >= effectiveMaxWeaponSlots}
                        >
                          {selectedWeapons.includes(w.id) ? 'EQUIPPED' : 'EQUIP'}
                        </button>
                      ) : (
                        !practiceMode && (
                        <button 
                          onClick={() => onUnlockWeapon(w.id)}
                          disabled={dataFragments < w.unlockCost}
                          className={`px-3 py-1 text-sm min-w-[80px] transition-all ${dataFragments >= w.unlockCost ? 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer' : 'bg-slate-800 text-gray-500 cursor-not-allowed'}`}
                        >
                          UNLOCK {w.unlockCost}
                        </button>
                        )
                      )}
                    </div>
                    
                    {isWeaponUnlocked(w.id) && nextUpgrade && !practiceMode && (
                       <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-1">
                          <span className="text-[10px] text-yellow-200 truncate pr-2">
                             NEXT: {nextUpgrade.description}
                          </span>
                          <button
                             onClick={() => onUpgradeWeapon(w.id)}
                             disabled={dataFragments < nextUpgrade.cost}
                             className={`text-[10px] px-2 py-0.5 border whitespace-nowrap ${dataFragments >= nextUpgrade.cost ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30 cursor-pointer' : 'border-slate-700 text-gray-600 cursor-not-allowed'}`}
                          >
                             UPGRADE ({nextUpgrade.cost})
                          </button>
                       </div>
                    )}
                  </div>
              )})}
            </div>
          </div>

          {/* Spell Selection */}
          <div className="border border-slate-700 p-4 md:p-6 bg-slate-900/50 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h2 className="text-xl text-purple-500">TACTICAL OVERRIDE [{selectedSpells.length}/{effectiveMaxSpellSlots}]</h2>
              {maxSpellSlots < 2 && !practiceMode && (
                <button 
                  onMouseEnter={() => audioService.playUiHover()}
                  onClick={() => onUpgradeSlot('spell')}
                  disabled={dataFragments < spellUpgradeCost}
                  className={`text-xs px-2 py-1 border ${dataFragments >= spellUpgradeCost ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30' : 'border-slate-700 text-slate-600'}`}
                >
                  + SLOT ({spellUpgradeCost})
                </button>
              )}
            </div>

            <div className="space-y-3 flex-grow">
              {Object.values(SPELL_CARDS).map(s => {
                const level = spellLevels[s.id];
                const nextUpgrade = level === 1 ? s.upgrades.lv2 : level === 2 ? s.upgrades.lv3 : null;

                return (
                <div 
                    key={s.id} 
                    className={`flex flex-col p-3 border transition-colors ${selectedSpells.includes(s.id) ? 'border-purple-400 bg-purple-900/20' : 'border-slate-800 bg-slate-900'}`}
                    onMouseEnter={(e) => handleMouseEnter(e, s.id, 'spell')}
                    onMouseLeave={handleMouseLeave}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="pr-2 flex-grow">
                      <div className={`font-bold flex items-center gap-2 ${isSpellUnlocked(s.id) ? 'text-white' : 'text-gray-600'}`}>
                         {s.name}
                         {isSpellUnlocked(s.id) && <span className="text-xs text-purple-300 border border-purple-800 px-1">LV.{level}</span>}
                      </div>
                      <div className="text-xs text-gray-400 leading-tight line-clamp-1">{s.description}</div>
                    </div>
                    {isSpellUnlocked(s.id) ? (
                      <button 
                        onClick={() => toggleSpell(s.id)}
                        className={`px-3 py-1 text-sm min-w-[80px] cursor-pointer transition-all ${selectedSpells.includes(s.id) ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-slate-700 hover:bg-slate-600'} ${!selectedSpells.includes(s.id) && selectedSpells.length >= effectiveMaxSpellSlots ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!selectedSpells.includes(s.id) && selectedSpells.length >= effectiveMaxSpellSlots}
                      >
                        {selectedSpells.includes(s.id) ? 'EQUIPPED' : 'EQUIP'}
                      </button>
                    ) : (
                       !practiceMode && (
                      <button 
                        onClick={() => onUnlockSpell(s.id)}
                        disabled={dataFragments < s.unlockCost}
                        className={`px-3 py-1 text-sm min-w-[80px] transition-all ${dataFragments >= s.unlockCost ? 'bg-yellow-600 hover:bg-yellow-500 text-white cursor-pointer' : 'bg-slate-800 text-gray-500 cursor-not-allowed'}`}
                      >
                        UNLOCK {s.unlockCost}
                      </button>
                       )
                    )}
                  </div>
                  
                   {isSpellUnlocked(s.id) && nextUpgrade && !practiceMode && (
                       <div className="flex justify-between items-center border-t border-slate-800 pt-2 mt-1">
                          <span className="text-[10px] text-yellow-200 truncate pr-2">
                             NEXT: {nextUpgrade.description}
                          </span>
                          <button
                             onClick={() => onUpgradeSpell(s.id)}
                             disabled={dataFragments < nextUpgrade.cost}
                             className={`text-[10px] px-2 py-0.5 border whitespace-nowrap ${dataFragments >= nextUpgrade.cost ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-900/30 cursor-pointer' : 'border-slate-700 text-gray-600 cursor-not-allowed'}`}
                          >
                             UPGRADE ({nextUpgrade.cost})
                          </button>
                       </div>
                    )}
                </div>
              )})}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4 sticky bottom-8 z-10 p-2 rounded-lg backdrop-blur-sm bg-black/30">
          <button 
             onMouseEnter={() => audioService.playUiHover()}
             onClick={onBack} 
             className="px-8 py-3 bg-slate-800 text-white border border-slate-600 hover:bg-slate-700 font-bold skew-x-[-12deg] cursor-pointer transition-transform hover:scale-105"
          >
             <span className="skew-x-[12deg] block">BACK</span>
          </button>
          <button 
             onMouseEnter={() => audioService.playUiHover()}
             onClick={() => onStart(selectedWeapons, selectedSpells)} 
             className="px-12 py-3 bg-cyan-600 text-white border border-cyan-400 hover:bg-cyan-500 font-bold skew-x-[-12deg] shadow-[0_0_15px_rgba(0,240,255,0.5)] cursor-pointer transition-transform hover:scale-105 hover:shadow-[0_0_25px_rgba(0,240,255,0.7)]"
          >
             <span className="skew-x-[12deg] block">
                 {practiceMode ? 'ENGAGE SIMULATION' : 'INITIATE MISSION'}
             </span>
          </button>
        </div>
      </div>
      {renderTooltip()}
    </div>
  );
};

export default LoadoutMenu;
