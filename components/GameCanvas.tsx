

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, Bullet, Enemy, Particle, WeaponId, SpellCardId, Difficulty, BoosterId, GameStats, DatabaseEntry } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SPELL_CARDS } from '../constants';
import { audioService } from '../services/audioService';
import SettingsMenu from './SettingsMenu';

interface GameCanvasProps {
  difficulty: Difficulty;
  loadout: { weapons: WeaponId[], spells: SpellCardId[] };
  weaponLevels: Record<WeaponId, number>;
  spellLevels: Record<SpellCardId, number>;
  activeBoosters: Set<BoosterId>;
  onGameOver: (score: number, win: boolean, fragments: number, sessionStats: Partial<GameStats>) => void;
  onExit: () => void;
  pityStacks: number;
  practiceMode?: { entry: DatabaseEntry, difficulty: Difficulty };
  playerBulletAlpha: number;
  setPlayerBulletAlpha: (val: number) => void;
}

const EASY_MOBS = ['drone', 'tank', 'interceptor', 'seeker', 'stealth', 'gorgon', 'kamikaze', 'aegis_bot', 'swarmer'];
const HARD_MOBS = ['lich', 'sniper', 'reflector', 'breacher'];

const GameCanvas: React.FC<GameCanvasProps> = ({ 
    difficulty, loadout, weaponLevels, spellLevels, activeBoosters, onGameOver, onExit, pityStacks, practiceMode, playerBulletAlpha, setPlayerBulletAlpha
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hudState, setHudState] = useState<{ 
      hp: number; score: number; stage: number; 
      bossName: string | null; dialogue: string | null; 
      spellsReady: boolean[]; shield: number; revives: number;
      bossHp: number; bossMaxHp: number;
      practiceTime: number; 
  }>({
    hp: 100, score: 0, stage: 1, bossName: null, dialogue: null, spellsReady: [], shield: 0, revives: 0,
    bossHp: 0, bossMaxHp: 0, practiceTime: 0
  });
  const [scale, setScale] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight;
      const scaleX = availableWidth / CANVAS_WIDTH;
      const scaleY = availableHeight / CANVAS_HEIGHT;
      const newScale = Math.min(scaleX, scaleY, 1.2); 
      setScale(newScale);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate Boosts
  const hpMultiplier = 1 + (0.05 * pityStacks);
  const damageMultiplier = 1 + (0.02 * pityStacks);
  const cdrMultiplier = 1 + (0.02 * pityStacks); 
  const incomingDamageMultiplier = activeBoosters.has(BoosterId.DMG_RED) ? 0.66 : 1.0;

  // Game State Refs
  const gameState = useRef({
    player: {
      id: 'player',
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      width: 8,
      height: 8,
      vx: 0,
      vy: 0,
      color: '#00f0ff',
      dead: false,
      hp: 100 * hpMultiplier,
      maxHp: 100 * hpMultiplier,
      invulnerableTime: 0,
      framesSinceLastHit: 0,
      grazing: 0,
      focused: false,
      equippedWeapons: loadout.weapons,
      equippedSpells: loadout.spells,
      spellCooldowns: loadout.spells.map(() => 0),
      weaponLevels: weaponLevels,
      spellLevels: spellLevels,
      shield: 0,
      revives: activeBoosters.has(BoosterId.EXTRA_LIFE) ? 1 : 0,
      activeBuffs: {} as Record<string, number>
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    frame: 0,
    score: 0,
    stage: 1,
    stageTimer: 0,
    bossActive: false,
    boss: null as Enemy | null,
    dataFragments: 0,
    difficulty: difficulty,
    timeScale: 1.0,
    dialogueTimer: 0,
    bossBannerTimer: 0,
    waveDelay: 0,
    isGameOver: false,
    // Mob Pool for current stage
    mobPool: [] as string[],
    // Session Stats
    stats: {
        kills: 0,
        bossKills: 0,
        shotsFired: 0
    },
    practiceTimer: 0 // Seconds elapsed in practice
  });

  // Init Mob Pool
  const refreshMobPool = useCallback(() => {
      if (practiceMode) {
          gameState.current.mobPool = [];
          return;
      }

      const state = gameState.current;
      // Default: Pick 6 random from EASY_MOBS
      const shuffledEasy = [...EASY_MOBS].sort(() => 0.5 - Math.random());
      const selectedEasy = shuffledEasy.slice(0, 6);
      
      let pool = [...selectedEasy];

      if (state.difficulty !== Difficulty.EASY) {
          if (state.stage >= 4) {
              const shuffledHard = [...HARD_MOBS].sort(() => 0.5 - Math.random());
              pool.push(shuffledHard[0]); // Add 1 hard
              
              if (state.stage >= 5) {
                  // Add 7th easy mob if available
                  if (shuffledEasy.length >= 7) pool.push(shuffledEasy[6]);
                  // Add 2nd hard mob
                  if (shuffledHard.length >= 2) pool.push(shuffledHard[1]);
              }
          }
      }
      
      state.mobPool = pool;
  }, [practiceMode]);

  useEffect(() => {
      refreshMobPool();
  }, [refreshMobPool]);

  // Initial Practice Setup
  useEffect(() => {
      if (practiceMode && practiceMode.entry.type === 'boss') {
          // Immediately spawn boss for practice
      }
  }, [practiceMode]);

  const spawnGhostDrone = (type: 'gorgon' | 'tank', x: number, y: number) => {
      const state = gameState.current;
      state.enemies.push({
          id: `ghost_${type}_${Date.now()}_${Math.random()}`,
          x: x, y: y,
          width: type === 'gorgon' ? 25 : 22,
          height: type === 'gorgon' ? 25 : 22,
          vx: 0, vy: 0,
          color: type === 'gorgon' ? 'rgba(0, 85, 255, 0.4)' : 'rgba(255, 170, 0, 0.4)',
          dead: false,
          hp: 999999, maxHp: 999999,
          type: 'drone', // Base type drone but isGhost handles behavior
          isGhost: true,
          ghostType: type,
          ghostState: 'idle',
          ghostTimer: Math.random() * 180 + 240, // 4-7s initial delay (increased delay per user request)
          scoreValue: 0,
          patternTimer: 0, shotTimer: 0
      });
  };

  const generateBoss = useCallback(async (forcedVariant?: string) => {
    const state = gameState.current;
    if (state.bossActive) return;

    state.bossActive = true;
    
    // Original variants
    const variants: ('alpha' | 'beta' | 'gamma' | 'delta' | 'theta' | 'somniomancer' | 'revenant' | 'alptraum')[] = ['alpha', 'beta', 'gamma', 'delta', 'theta'];
    
    // NEW BOSSES: Somniomancer, Revenant, Alptraum (Hard+ only)
    if (state.difficulty === Difficulty.HARD || state.difficulty === Difficulty.EXTREME || state.difficulty === Difficulty.INFINITY || state.difficulty === Difficulty.BOSS_RUSH_EXTREME) {
        variants.push('somniomancer', 'revenant', 'alptraum');
    }

    let variant = variants[Math.floor(Math.random() * variants.length)];
    
    if (state.difficulty === Difficulty.BOSS_RUSH || state.difficulty === Difficulty.BOSS_RUSH_EXTREME) {
        variant = variants[(state.stage - 1) % variants.length];
    }
    
    // Practice Mode Override
    if (forcedVariant) {
        variant = forcedVariant as any;
    }

    const variantNameMap: Record<string, string> = {
        'alpha': 'CONSTRUCT', 'beta': 'VIPER', 'gamma': 'TITAN', 'delta': 'SERAPH', 'theta': 'ORACLE',
        'somniomancer': 'SOMNIOMANCER', 'revenant': 'REVENANT', 'alptraum': 'ALPTRAUM'
    };
    const variantName = variantNameMap[variant];

    setHudState(prev => ({ 
        ...prev, 
        dialogue: "WARNING: MASSIVE SIGNAL DETECTED", 
        bossName: `UNIT-0${state.stage}-${variantName} [${state.difficulty}]` 
    }));
    state.dialogueTimer = 120; 
    state.bossBannerTimer = 480; // 8 seconds

    let finalHp = 2500;

    if (state.difficulty === Difficulty.BOSS_RUSH) {
        const startHp = 5000;
        const endHp = 20000;
        const progress = Math.min(1, (state.stage - 1) / 14);
        finalHp = startHp + (endHp - startHp) * progress;
    } else if (state.difficulty === Difficulty.BOSS_RUSH_EXTREME) {
        const startHp = 10000;
        const endHp = 50000;
        const progress = Math.min(1, (state.stage - 1) / 14);
        finalHp = startHp + (endHp - startHp) * progress;
    } else {
        let bossHpBase = 2500;
        let multiplier = state.difficulty === Difficulty.EASY ? 0.6 : state.difficulty === Difficulty.HARD ? 1.5 : state.difficulty === Difficulty.EXTREME ? 2.0 : 1.0;
        
        if (state.difficulty === Difficulty.INFINITY) {
           // Infinity scaling: Harder than Extreme after a few stages
           multiplier = 2.5 * (1 + (state.stage * 0.75));
        }
        finalHp = bossHpBase * state.stage * multiplier;
    }

    if (practiceMode) {
        // Flat scaling for practice based on selected difficulty, ignore stage
        let multiplier = state.difficulty === Difficulty.EASY ? 0.6 : state.difficulty === Difficulty.HARD ? 1.5 : state.difficulty === Difficulty.EXTREME ? 2.0 : 1.0;
        finalHp = 2500 * multiplier * 2; // Double Health for practice
    }

    if (variant === 'gamma') finalHp *= 1.25;
    if (variant === 'revenant') finalHp *= 1.3; // Tanky undead

    const bossId = `boss_${Date.now()}`;

    state.boss = {
      id: bossId,
      x: CANVAS_WIDTH / 2,
      y: -100, 
      width: variant === 'gamma' ? 60 : 40,
      height: variant === 'gamma' ? 60 : 40,
      vx: 0,
      vy: 0,
      color: variant === 'alpha' ? '#ff0055' : 
             variant === 'beta' ? '#ffff00' : 
             variant === 'gamma' ? '#5500ff' : 
             variant === 'delta' ? '#ffffff' : // SERAPH IS WHITE
             variant === 'theta' ? '#ffd700' : 
             variant === 'somniomancer' ? '#9d00ff' : 
             variant === 'revenant' ? '#aa0000' : '#444',
      dead: false,
      hp: finalHp,
      maxHp: finalHp,
      type: 'boss',
      variant: variant,
      scoreValue: 5000 * state.stage,
      patternTimer: 0,
      shotTimer: 0,
      state: 'entering',
      // New Phase Props
      phase: 1,
      fightStartFrame: 0, // Will sync when entering ends
      dmgReduction: 0.5, // 50% shield on entry
      dmgReductionTimer: 300, // 5s duration
      trinityActive: false,
      trinityTimer: 0
    };
    
    // Variant Init
    if (variant === 'theta') {
       state.boss.shieldHp = 0; 
       state.boss.shieldMax = finalHp * 0.08;
       state.boss.shieldActive = false;
       state.boss.shieldTimer = 0;
    }
    
    if (variant === 'beta' || variant === 'revenant') {
       state.boss.dashState = 'idle';
       state.boss.dashTimer = 0;
    }

    if (variant === 'somniomancer') {
        const angle = Math.random() * Math.PI * 2;
        const strength = 1.2;
        state.boss.gravityDir = { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
        state.boss.gravityTimer = 1800; 
    }

    if (variant === 'alptraum') {
        // Spawn ONLY Gorgon drone for Phase 1
        spawnGhostDrone('gorgon', -50, -50);
        
        // Init Shield for Alptraum
        state.boss.shieldHp = finalHp * 0.15;
        state.boss.shieldMax = finalHp * 0.15;
        state.boss.shieldActive = true;
        state.boss.shieldTimer = 0;
    }

    state.enemies.push(state.boss);

    if (variant === 'delta') {
       const droneCount = 6;
       for (let i = 0; i < droneCount; i++) {
          state.enemies.push({
             id: `seraph_drone_${i}_${Date.now()}`,
             x: state.boss.x,
             y: state.boss.y,
             width: 15,
             height: 15,
             vx: 0, vy: 0,
             color: '#ccffff',
             dead: false,
             hp: finalHp * 0.25, 
             maxHp: finalHp * 0.25,
             type: 'seraph_drone',
             scoreValue: 500,
             patternTimer: 0,
             shotTimer: Math.random() * 60,
             parentId: bossId,
             orbitAngle: (Math.PI * 2 / droneCount) * i,
             orbitRadius: 100,
             orbitSpeed: 0.02
          });
       }
    }

  }, [practiceMode]);

  const spawnEnemy = (t: number) => {
    const state = gameState.current;
    
    // Practice Mode Spawning
    if (practiceMode) {
        if (practiceMode.entry.type === 'boss') {
            if (!state.bossActive && !state.boss) {
                generateBoss(practiceMode.entry.bossVariant);
            }
            return;
        } else {
            // Mob Practice
            let spawnRate = state.difficulty === Difficulty.HARD ? 15 : state.difficulty === Difficulty.EASY ? 50 : 30;
            if (state.difficulty === Difficulty.EXTREME) spawnRate = 10;
            
            if (t % spawnRate === 0) {
                 const mobType = practiceMode.entry.gameId; // e.g. 'drone', 'sniper'
                 const x = Math.random() * (CANVAS_WIDTH - 40) + 20;
                 // Use normal spawn logic helper below but force type
                 spawnSpecificMob(mobType, x);
            }
            return;
        }
    }

    if (state.difficulty === Difficulty.BOSS_RUSH || state.difficulty === Difficulty.BOSS_RUSH_EXTREME) {
       if (state.bossActive) return;
       if (state.waveDelay <= 0) {
          generateBoss();
       }
       return; 
    }

    if (state.bossActive) return;
    if (state.waveDelay > 0) return; 

    let spawnRate = state.difficulty === Difficulty.HARD ? 15 : state.difficulty === Difficulty.EASY ? 50 : 30;
    if (state.difficulty === Difficulty.EXTREME) spawnRate = 10;
    
    if (state.difficulty === Difficulty.INFINITY) {
       // Infinity spawn rate caps at very fast
       spawnRate = Math.max(4, 15 - state.stage * 3); 
    }
    
    if (t % spawnRate === 0) {
      if (state.mobPool.length === 0) refreshMobPool();

      // NEW SPAWNING LOGIC
      const rand = Math.random();
      const mobType = state.mobPool[Math.floor(rand * state.mobPool.length)];
      const x = Math.random() * (CANVAS_WIDTH - 40) + 20;
      spawnSpecificMob(mobType, x);
    }

    if (state.stageTimer > 1800 && !state.bossActive) {
       generateBoss();
    }
  };

  const spawnSpecificMob = (mobType: string, x: number) => {
      const state = gameState.current;
      
      // Default Stats
      let hp = 30;
      let w = 15;
      let score = 100;
      let color = '#fff';

      // Stats Lookup
      switch(mobType) {
          case 'drone': hp=30; w=12; score=100; color='#aa00ff'; break;
          case 'interceptor': hp=60; w=15; score=300; color='#00ffaa'; break;
          case 'tank': hp=150; w=22; score=600; color='#ffaa00'; break;
          case 'seeker': hp=20; w=10; score=200; color='#ff0000'; break;
          case 'stealth': hp=80; w=18; score=500; color='#444444'; break;
          // NEW MOBS
          case 'gorgon': hp=200; w=25; score=800; color='#0055ff'; break;
          case 'kamikaze': hp=40; w=12; score=400; color='#ff3300'; break;
          case 'aegis_bot': hp=120; w=20; score=700; color='#0088ff'; break;
          case 'swarmer': hp=10; w=8; score=50; color='#cc00cc'; break;
          case 'lich': hp=300; w=20; score=1500; color='#660066'; break;
          case 'sniper': hp=100; w=15; score=1000; color='#ff0055'; break;
          case 'reflector': hp=250; w=25; score=1200; color='#ffffff'; break;
          case 'breacher': hp=180; w=22; score=900; color='#ff8800'; break;
      }

      let hpMult = 1 + (state.stage * 0.2);
      if (state.difficulty === Difficulty.INFINITY) hpMult = 1 + (state.stage * 0.8); // Higher HP scaling for Infinity
      if (practiceMode) hpMult = 1; // Base stats for practice

      const newEnemy: Enemy = {
        id: `enemy_${Date.now()}_${Math.random()}`,
        x,
        y: -30,
        width: w,
        height: w,
        vx: 0, 
        vy: 0, 
        color: color,
        dead: false,
        hp: hp * hpMult,
        maxHp: hp * hpMult,
        type: mobType as any,
        scoreValue: score,
        patternTimer: 0,
        shotTimer: Math.random() * 60
      };

      // Specific Init
      if (mobType === 'gorgon') { newEnemy.laserCharge = 0; newEnemy.burstCount = 0; }
      if (mobType === 'aegis_bot') { newEnemy.shieldActive = true; newEnemy.shieldTimer = 0; }
      if (mobType === 'sniper') { newEnemy.laserCharge = 0; newEnemy.dmgReduction = 0; newEnemy.invulnTimer = 0; }
      if (mobType === 'reflector') { newEnemy.isReflecting = false; newEnemy.patternTimer = 0; }
      if (mobType === 'lich') { newEnemy.patternTimer = Math.floor(Math.random() * 240); }

      state.enemies.push(newEnemy);
  }

  const createExplosion = (x: number, y: number, radius: number, damage: number) => {
    const state = gameState.current;
    let finalDamage = activeBoosters.has(BoosterId.ATTACK_UP) ? damage * 1.25 : damage;
    finalDamage *= damageMultiplier; 

    for(let i=0; i<8; i++) {
       state.particles.push({
          id: `p_exp_${Math.random()}`, x, y, width: radius/2, height: radius/2,
          vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
          color: '#ff5500', life: 15, maxLife: 15, alpha: 1, dead: false
       });
    }
    state.enemies.forEach(e => {
       const dist = Math.sqrt(Math.pow(e.x - x, 2) + Math.pow(e.y - y, 2));
       if (dist < radius + e.width) {
          if (e.type !== 'boss_clone') { // Clones don't take explosion dmg normally
             e.hp -= finalDamage;
          }
       }
    });
  };

  const activateSpell = (index: number) => {
    const state = gameState.current;
    if (!state.player.equippedSpells[index]) return;
    
    if (state.player.spellCooldowns[index] <= 0) {
      const spellId = state.player.equippedSpells[index];
      const lvl = state.player.spellLevels[spellId];
      let cooldown = SPELL_CARDS[spellId].cooldown * 60;
      
      if (activeBoosters.has(BoosterId.CDR_UP)) cooldown *= 0.8;
      
      cooldown = cooldown / cdrMultiplier;

      if (spellId === SpellCardId.EMP_BLAST && lvl >= 2) cooldown -= 300; 
      if (spellId === SpellCardId.PHANTOM_DASH && lvl >= 3) cooldown -= 600;

      state.player.spellCooldowns[index] = Math.max(60, cooldown);
      audioService.playSpell();
      
      switch(spellId) {
        case SpellCardId.EMP_BLAST:
           state.bullets = state.bullets.filter(b => b.owner === 'player');
           if (lvl >= 3) {
              state.enemies.forEach(e => {
                  e.hp -= 200 * damageMultiplier;
                  createExplosion(e.x, e.y, 50, 0);
              });
           }
           break;
        case SpellCardId.TIME_DILATOR: {
          let duration = 300; 
          if (lvl >= 2) duration += 120;
          if (lvl >= 3) duration += 180;
          state.player.activeBuffs[SpellCardId.TIME_DILATOR] = duration;
          break;
        }
        case SpellCardId.OVERCLOCK: {
          let duration = 300; 
          if (lvl >= 2) duration += 120; 
          state.player.activeBuffs[SpellCardId.OVERCLOCK] = duration;
          break;
        }
        case SpellCardId.PHANTOM_DASH:
          let invuln = 240; 
          if (lvl >= 2) invuln += 60;
          state.player.invulnerableTime = invuln; 
          break;
        case SpellCardId.ORBITAL_STRIKE:
           let strikeDmg = 3000;
           let strikeRad = 100;
           if (lvl >= 2) strikeRad = 150;
           if (lvl >= 3) strikeDmg = 6000;
           state.enemies.forEach(e => {
              e.hp -= strikeDmg * damageMultiplier;
              createExplosion(e.x, e.y, strikeRad, 0);
           });
           break;
        case SpellCardId.NANO_REPAIR:
           const healPercent = lvl >= 2 ? 0.5 : 0.3;
           state.player.hp = Math.min(state.player.maxHp, state.player.hp + (state.player.maxHp * healPercent));
           if (lvl >= 3) {
             state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
           }
           break;
        case SpellCardId.AEGIS_SHIELD:
           const shieldAmt = lvl >= 2 ? 80 : 50;
           state.player.shield = (state.player.shield || 0) + shieldAmt;
           break;
        case SpellCardId.STASIS_FIELD:
           const freezeDur = lvl >= 2 ? 300 : 180;
           state.enemies.forEach(e => {
             e.frozenTimer = freezeDur;
           });
           break;
      }
    }
  };

  const update = () => {
    if (isPaused) return;
    const state = gameState.current;
    if (state.isGameOver) return;

    state.frame++;
    state.stageTimer++;

    // Practice Mode Timer Logic
    if (practiceMode) {
        if (state.frame % 60 === 0) {
            state.practiceTimer++;
            if (practiceMode.entry.type === 'mob' && state.practiceTimer >= 60) {
                // Practice Win (Mob)
                state.isGameOver = true;
                onGameOver(state.score, true, 0, {});
                return;
            }
        }
    }

    Object.keys(state.player.activeBuffs).forEach(key => {
        if (state.player.activeBuffs[key] > 0) state.player.activeBuffs[key]--;
        else delete state.player.activeBuffs[key];
    });

    if (state.player.activeBuffs[SpellCardId.TIME_DILATOR]) {
        state.timeScale = 0.2;
    } else {
        state.timeScale = 1.0;
    }

    if (state.dialogueTimer > 0) {
      state.dialogueTimer--;
      if (state.dialogueTimer <= 0) setHudState(prev => ({ ...prev, dialogue: null }));
    }

    // Boss Warning Banner Timer
    if (state.bossBannerTimer > 0) {
        state.bossBannerTimer--;
        if (state.bossBannerTimer <= 0) {
            setHudState(prev => ({ ...prev, bossName: null }));
        }
    }

    if (state.waveDelay > 0) state.waveDelay--;

    const isShift = state.keys['ShiftLeft'] || state.keys['ShiftRight'];
    const isOverclocked = (state.player.activeBuffs[SpellCardId.OVERCLOCK] || 0) > 0;
    let speed = (isShift ? 2.5 : 5) * (isOverclocked ? 2 : 1); 
    
    state.player.focused = !!isShift;
    
    if (state.keys['KeyX']) activateSpell(0);
    if (state.keys['KeyC']) activateSpell(1);
    if (state.keys['KeyV']) activateSpell(2);

    state.player.spellCooldowns = state.player.spellCooldowns.map(cd => Math.max(0, cd - 1));

    state.player.framesSinceLastHit++;
    const regenThreshold = activeBoosters.has(BoosterId.REGEN_UP) ? 300 : 600; 
    if (state.player.framesSinceLastHit > regenThreshold) { 
       if (state.frame % 60 === 0 && state.player.hp < state.player.maxHp) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
       }
    }

    // Boss Effect: Somniomancer Gravity
    if (state.bossActive && state.boss?.variant === 'somniomancer') {
        const boss = state.boss;
        // Apply random gravity every 30 seconds (1800 frames)
        if (state.frame % 1800 === 0) {
            const angle = Math.random() * Math.PI * 2;
            const strength = 1.2;
            boss.gravityDir = { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
            boss.gravityTimer = 1800; // Constant throughout the frames
        }

        if (boss.gravityTimer && boss.gravityTimer > 0) {
             boss.gravityTimer--;
             if (boss.gravityDir) {
                 state.player.vx = boss.gravityDir.x; // Add to movement vector logic below
                 state.player.vy = boss.gravityDir.y;
             }
        } else {
            state.player.vx = 0;
            state.player.vy = 0;
        }
    } else {
        state.player.vx = 0; 
        state.player.vy = 0;
    }

    // Movement
    if (state.keys['ArrowUp'] || state.keys['KeyW']) state.player.y = Math.max(state.player.height, state.player.y - speed);
    if (state.keys['ArrowDown'] || state.keys['KeyS']) state.player.y = Math.min(CANVAS_HEIGHT - state.player.height, state.player.y + speed);
    if (state.keys['ArrowLeft'] || state.keys['KeyA']) state.player.x = Math.max(state.player.width, state.player.x - speed);
    if (state.keys['ArrowRight'] || state.keys['KeyD']) state.player.x = Math.min(CANVAS_WIDTH - state.player.width, state.player.x + speed);
    
    // Apply External Forces (Gravity)
    state.player.x += state.player.vx;
    state.player.y += state.player.vy;
    
    // Bounds Check again
    state.player.x = Math.max(state.player.width, Math.min(CANVAS_WIDTH - state.player.width, state.player.x));
    state.player.y = Math.max(state.player.height, Math.min(CANVAS_HEIGHT - state.player.height, state.player.y));


    if (state.keys['KeyZ'] || state.keys['Space']) {
      const ocLevel = state.player.spellLevels[SpellCardId.OVERCLOCK];
      
      let baseFireRate = 6;
      if (isOverclocked) baseFireRate = ocLevel >= 3 ? 2 : 3;

      if (state.frame % baseFireRate === 0) {
        let dmgMult = activeBoosters.has(BoosterId.ATTACK_UP) ? 1.25 : 1.0;
        dmgMult *= damageMultiplier; 

        state.player.equippedWeapons.forEach(wId => {
          const p = state.player;
          const lvl = state.player.weaponLevels[wId];
          state.stats.shotsFired++; // Track Stats
          
          switch(wId) {
            case WeaponId.PLASMA_CUTTER: {
               const dmg = (lvl >= 2 ? 13 : 10) * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y - 10, width: 4, height: 12, vx: 0, vy: -15, color: '#00f0ff', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId });
               if (lvl >= 3) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x-8, y: p.y - 5, width: 3, height: 10, vx: -1, vy: -15, color: '#00f0ff', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId });
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x+8, y: p.y - 5, width: 3, height: 10, vx: 1, vy: -15, color: '#00f0ff', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId });
               }
               break;
            }
            case WeaponId.SPREAD_SHOTGUN: {
               const spreadCount = lvl >= 3 ? 3 : 2;
               const damage = (lvl >= 2 ? 7 : 5) * dmgMult;
               const piercing = lvl >= 3;
               for(let i = -spreadCount; i <= spreadCount; i++) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 3, height: 3, vx: i * 2, vy: -12, color: '#ff5500', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId, piercing: piercing });
               }
               break;
            }
            case WeaponId.HOMING_NEEDLES: {
               const speedMult = lvl >= 2 ? 1.5 : 1;
               const count = lvl >= 3 ? 4 : 2;
               const damage = 4 * dmgMult;
               for(let i=0; i<count; i++) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x + (i*10 - (count*5)), y: p.y, width: 3, height: 6, vx: (Math.random()-0.5)*4, vy: -10 * speedMult, color: '#ff00aa', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId });
               }
               break;
            }
            case WeaponId.LASER_STREAM: {
               const w = lvl >= 2 ? 10 : 6; 
               const d = (lvl >= 3 ? 34 : 22.5) * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y - 10, width: w, height: 40, vx: 0, vy: -25, color: '#aa00ff', dead: false, owner: 'player', damage: d, timer: 0, weaponId: wId, piercing: true, hitList: [] });
               break;
            }
            case WeaponId.WAVE_MOTION: {
               const dmg = 13.5 * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 8, height: 8, vx: 0, vy: -8, color: '#00ffaa', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId, initialX: p.x });
               if (lvl >= 3) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 8, height: 8, vx: 0, vy: -8, color: '#00ffaa', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId, initialX: p.x, splashRadius: 1 }); 
               }
               break;
            }
            case WeaponId.ROCKET_BARRAGE: {
               const radius = lvl >= 2 ? 90 : 60;
               const isCluster = lvl >= 3;
               const damage = 10 * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 8, height: 12, vx: (Math.random()-0.5)*2, vy: -4, color: '#ff0000', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId, splashRadius: radius, chainCount: isCluster ? -1 : 0 });
               break;
            }
            case WeaponId.CHAIN_LIGHTNING: {
               const jumps = lvl >= 3 ? 8 : 4;
               const rangeMult = lvl >= 2 ? 2.0 : 1.2;
               const dmg = (lvl >= 2 ? 39 : 27) * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 4, height: 10, vx: 0, vy: -18, color: '#00aaff', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId, chainCount: jumps, orbitRadius: rangeMult });
               break;
            }
            case WeaponId.BACK_TURRET: {
               const damage = (lvl >= 2 ? 26 : 19) * dmgMult;
               state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y + 10, width: 6, height: 10, vx: 0, vy: 12, color: '#aaaaaa', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId });
               if (lvl >= 3) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y - 10, width: 6, height: 10, vx: 0, vy: -12, color: '#aaaaaa', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId });
               }
               break;
            }
            case WeaponId.VORTEX_DRIVER: {
               if (state.frame % 53 === 0) { 
                 const strength = lvl >= 2 ? 1.5 : 1; 
                 const targetY = 100 + Math.random() * 120;
                 const dist = p.y - targetY;
                 const initialVy = -(dist * 0.042); 

                 state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 12, height: 12, vx: 0, vy: initialVy, color: '#ffffff', dead: false, owner: 'player', damage: 5 * dmgMult, timer: 0, weaponId: wId, isVortex: true, orbitRadius: strength, chainCount: lvl >= 3 ? 1 : 0 });
               }
               break;
            }
            case WeaponId.ORBITING_ORBS: {
               const existingOrbs = state.bullets.filter(b => b.owner === 'player' && b.weaponId === WeaponId.ORBITING_ORBS && !b.dead).length;
               const maxOrbs = lvl === 1 ? 2 : lvl === 2 ? 3 : 4;
               const rad = lvl >= 3 ? 80 : 60;
               const speed = lvl >= 2 ? 0.3 : 0.15;
               const dmg = (lvl >= 2 ? 20 : 15) * dmgMult;
               
               if (existingOrbs < maxOrbs && state.frame % 10 === 0) {
                  state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: 10, height: 10, vx: 0, vy: 0, color: '#ffff00', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId, orbitAngle: (existingOrbs * (360/maxOrbs)) * (Math.PI/180), orbitRadius: rad, splashRadius: speed }); 
               }
               break;
            }
            case WeaponId.GAUSS_CANNON: {
               if (state.frame % 40 === 0) { 
                 const isRail = lvl >= 3;
                 const piercingCount = lvl >= 2 ? 3 : 1;
                 const dmg = 800 * dmgMult;
                 state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y - 10, width: 5, height: 30, vx: 0, vy: -40, color: '#00ff00', dead: false, owner: 'player', damage: dmg, timer: 0, weaponId: wId, piercing: true, chainCount: isRail ? 99 : piercingCount }); 
               }
               break;
            }
            case WeaponId.PULSE_NOVA: {
               if (state.frame % 50 === 0) {
                 const size = lvl >= 3 ? 60 : 30;
                 const pulseRate = lvl >= 2 ? 10 : 20;
                 const damage = 100 * dmgMult;
                 state.bullets.push({ id: `b_${Math.random()}`, x: p.x, y: p.y, width: size, height: size, vx: 0, vy: -2, color: '#ff00ff', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId, piercing: true, splashRadius: pulseRate }); 
               }
               break;
            }
            case WeaponId.PHASE_BLADES: {
               if (state.frame % 30 === 0) {
                  const count = lvl >= 2 ? 3 : 2;
                  const damage = 18 * dmgMult;
                  for(let i=0; i<count; i++) {
                     const b = { id: `b_${Math.random()}`, x: p.x + (Math.random()-0.5)*40, y: p.y, width: 8, height: 8, vx: (Math.random()-0.5)*5, vy: -10, color: '#ff8800', dead: false, owner: 'player', damage: damage, timer: 0, weaponId: wId };
                     state.bullets.push(b as Bullet);
                  }
               }
               break;
            }
          }
        });
        audioService.playShoot();
      }
    }

    spawnEnemy(state.frame);

    // Enemies
    state.enemies.forEach(e => {
      // Manage Shield Timer
      if (e.dmgReductionTimer && e.dmgReductionTimer > 0) {
          e.dmgReductionTimer--;
          if (e.dmgReductionTimer <= 0) {
              e.dmgReduction = 0;
          }
      }

      // Alptraum Ghost Drone Logic
      if (e.isGhost && e.type === 'drone') {
          // If no boss, ghosts leave
          if (!state.bossActive) {
              e.y -= 5;
              if (e.y < -100) e.dead = true;
              return;
          }

          if (e.ghostState === 'idle') {
              // Wait for random time
              if (e.ghostTimer && e.ghostTimer > 0) {
                  e.ghostTimer--;
              } else {
                  // Transition to Positioning
                  e.ghostState = 'positioning';
                  // Pick spot 150-250 units from player
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 150 + Math.random() * 100;
                  e.targetPos = {
                      x: Math.max(20, Math.min(CANVAS_WIDTH - 20, state.player.x + Math.cos(angle) * dist)),
                      y: Math.max(20, Math.min(CANVAS_HEIGHT - 100, state.player.y + Math.sin(angle) * dist))
                  };
              }
          } else if (e.ghostState === 'positioning') {
              if (e.targetPos) {
                  e.x += (e.targetPos.x - e.x) * 0.1;
                  e.y += (e.targetPos.y - e.y) * 0.1;
                  // If close enough
                  if (Math.abs(e.x - e.targetPos.x) < 5 && Math.abs(e.y - e.targetPos.y) < 5) {
                      e.ghostState = 'charging';
                      e.ghostTimer = 60; // Charge time (1s)
                  }
              }
          } else if (e.ghostState === 'charging') {
              if (e.ghostTimer && e.ghostTimer > 0) e.ghostTimer--;
              else {
                  e.ghostState = 'firing';
                  // FIRE
                  const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                  const spread = (Math.random() - 0.5) * (20 * Math.PI / 180); // +/- 10 deg
                  const finalAngle = angle + spread;
                  
                  if (e.ghostType === 'gorgon') {
                      // Laser Shot (Slowed)
                      state.bullets.push({ 
                          id: `ghost_laser_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, 
                          vx: Math.cos(finalAngle) * 8 * 0.75, vy: Math.sin(finalAngle) * 8 * 0.75, // 75% speed
                          color: '#0055ff', dead: false, owner: 'enemy', damage: 20, timer: 0 
                      });
                  } else {
                      // Tank Shot (Spread, Slowed)
                      for(let k=-1; k<=1; k++) {
                           state.bullets.push({ 
                              id: `ghost_shell_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, 
                              vx: Math.cos(finalAngle + k*0.2) * 5 * 0.75, vy: Math.sin(finalAngle + k*0.2) * 5 * 0.75, // 75% speed
                              color: '#ffaa00', dead: false, owner: 'enemy', damage: 15, timer: 0 
                           });
                      }
                  }
                  e.ghostState = 'idle';
                  // Increased frequency delay by ~50% (was 120-300, now 180-480)
                  e.ghostTimer = Math.random() * 180 + 300; 
              }
          }
          return; // Skip normal logic
      }

      // Boss Phase 2 Transition Logic
      if (e.type === 'boss') {
          // Trigger Phase 2
          if (e.phase === 1 && e.hp < e.maxHp * 0.4) {
              e.phase = 2;
              e.phaseTransitionTimer = 120; // 2 seconds animation
              e.dmgReduction = 0.5; // Shield active
              e.dmgReductionTimer = 300; // 5 seconds
              
              // Visual flair for phase change
              createExplosion(e.x, e.y, 200, 0); 
              setHudState(prev => ({...prev, dialogue: "CRITICAL DAMAGE. LIMITERS DISENGAGED."}));
              state.dialogueTimer = 180;
              
              // Clear player bullets for dramatic pause
              state.bullets.filter(b => b.owner === 'player').forEach(b => {
                  createExplosion(b.x, b.y, 20, 0);
                  b.dead = true;
              });

              if (e.variant === 'somniomancer') {
                  // Spawn Replica
                  state.enemies.push({
                      id: `somnio_replica_${Date.now()}`,
                      x: e.x + 100, y: e.y, width: e.width, height: e.height,
                      vx: 0, vy: 0, color: '#9d00ff', dead: false,
                      hp: 999999, maxHp: 999999, type: 'boss_clone', scoreValue: 0, patternTimer: 0, shotTimer: 0,
                      variant: 'somniomancer', phase: 2
                  });
              }

              // ALPTRAUM PHASE 2: SPAWN TANK DRONE
              if (e.variant === 'alptraum') {
                  // Spawn Tank Drone (Was previously in gen)
                  spawnGhostDrone('tank', CANVAS_WIDTH + 50, CANVAS_HEIGHT / 2);
              }
          }

          // Handle Phase Transition Animation
          if (e.phaseTransitionTimer && e.phaseTransitionTimer > 0) {
              e.phaseTransitionTimer--;
              // Freeze movement calculation time by advancing start frame
              e.fightStartFrame = (e.fightStartFrame || 0) + 1;
              // Don't attack during transition
              return; 
          }
      }

      // Clone Logic (Somniomancer Phase 2)
      if (e.type === 'boss_clone' && e.variant === 'somniomancer') {
          const t = state.frame;
          e.x = CANVAS_WIDTH / 2 + Math.cos(t * 0.02) * 150;
          e.y = 100 + Math.sin(t * 0.03) * 50;
          // Clone uses attack 1 & 2 logic below
      }
      
      // Alptraum Mini Boss Logic
      if (e.type === 'alp_mini_boss') {
          // Orbit Alptraum
          if (e.parentId) {
              const parent = state.enemies.find(p => p.id === e.parentId);
              if (parent && !parent.dead) {
                  e.orbitAngle = (e.orbitAngle || 0) + 0.02;
                  e.x = parent.x + Math.cos(e.orbitAngle) * 120;
                  e.y = parent.y + Math.sin(e.orbitAngle) * 120;
              } else {
                  e.dead = true;
              }
          }
          // Attack logic handled in mob specific section below
      }

      if (e.frozenTimer && e.frozenTimer > 0) {
          e.frozenTimer--;
          return; 
      }

      e.patternTimer++;
      e.shotTimer++;

      if (e.type === 'boss' || e.type === 'boss_clone') {
         if (e.state === 'entering') {
             const targetY = 100;
             e.y += (targetY - e.y) * 0.02;
             if (Math.abs(e.y - targetY) < 1) {
                 e.state = 'fighting';
                 e.fightStartFrame = state.frame; // Sync movement start to be centered
             }
             return; 
         }
         
         const isPhase2 = e.phase === 2;
         // Movement Phase Sync
         const t = state.frame - (e.fightStartFrame || 0);

         // Boss Passive Spawns
         if (e.type === 'boss' && e.variant === 'revenant') {
             // Passive Kamikaze spawn
             if (state.frame % 60 === 0) {
                 const kX = Math.random() * (CANVAS_WIDTH - 20) + 10;
                 state.enemies.push({
                    id: `rev_kamikaze_${Date.now()}`, x: kX, y: -20, width: 12, height: 12, vx: 0, vy: 0,
                    color: '#ff3300', dead: false, hp: 40, maxHp: 40, type: 'kamikaze', scoreValue: 100, patternTimer: 0, shotTimer: 0
                 });
             }
         }

         // Boss Summoning Logic (Generic)
         if (e.type === 'boss' && (state.stage > 1 || practiceMode) && e.variant !== 'revenant' && e.variant !== 'alptraum') {
             const summonInterval = Math.max(180, 720 - ((state.stage - 2) * 120));
             if (state.frame % summonInterval === 0) {
                 const pool = state.mobPool.length > 0 ? state.mobPool : EASY_MOBS;
                 const mobType = pool[Math.floor(Math.random() * pool.length)]; 
                 for(let k=0; k<2; k++) {
                     state.enemies.push({
                        id: `summon_${Date.now()}_${k}`,
                        x: e.x + (Math.random() - 0.5) * 100,
                        y: e.y + 20,
                        width: 15, height: 15,
                        vx: 0, vy: 0, color: '#fff', 
                        dead: false, hp: 30, maxHp: 30, type: mobType as any, scoreValue: 0, patternTimer: 0, shotTimer: Math.random() * 60
                     });
                 }
             }
         }

         // Movement Logic (Bosses)
         if (e.type === 'boss') {
            if (e.variant === 'beta' || e.variant === 'revenant') {
               // ... existing beta dash logic ...
                if (e.variant === 'beta') {
                     // ... Viper dash code (abbreviated for brevity as requested "no changes to other bots" but context needed)
                     // Keeping Viper code from previous file content
                     if (isPhase2) {
                         e.dashTimer = (e.dashTimer || 0) + 1;
                         if (e.dashState === 'idle' && e.dashTimer > 240) {
                             e.dashState = 'warning'; e.dashTimer = 0;
                         } else if (e.dashState === 'warning') {
                             if (e.dashTimer > 60) { e.dashState = 'dashing'; e.dashTimer = 0; e.vy = 25; }
                         } else if (e.dashState === 'dashing') {
                             e.y += e.vy;
                             if (state.frame % 3 === 0) { state.bullets.push({ id: `viper_dash_${Math.random()}`, x: e.x, y: e.y, width: 10, height: 10, vx: (Math.random()-0.5)*6, vy: 0, color: '#ffff00', dead: false, owner: 'enemy', damage: 20, timer: 0 }); }
                             if (e.y > CANVAS_HEIGHT + 100) { e.y = -100; e.vy = 5; e.dashState = 'returning'; }
                         } else if (e.dashState === 'returning') {
                             e.y += e.vy; e.x += (CANVAS_WIDTH / 2 - e.x) * 0.1;
                             if (e.y >= 150) { e.y = 150; e.x = CANVAS_WIDTH / 2; e.vy = 0; e.dashState = 'idle'; e.dashTimer = 0; e.fightStartFrame = state.frame; }
                         }
                     }
                     if (e.dashState === 'idle' || e.dashState === 'warning') {
                         e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.04) * 200; e.y = 100 + Math.cos(t * 0.03) * 50;
                     }
                } else {
                    // Revenant Movement (Simpler than before)
                    e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.02) * 150;
                    e.y = 120 + Math.sin(t * 0.05) * 30;
                }
            } else if (e.variant === 'somniomancer') {
                e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.02) * 100 + Math.cos(t * 0.05) * 50;
                e.y = 100 + Math.sin(t * 0.03) * 30;
            } else if (e.variant === 'alptraum') {
                // ALPTRAUM MOVEMENT: Aggressive, top 33%
                // Logic: Move quickly to a random point in top 33%, stop for a bit, then move again
                const topLimit = CANVAS_HEIGHT * 0.33;
                if (!e.targetPos) {
                    // Pick new spot
                    e.targetPos = {
                        x: Math.random() * (CANVAS_WIDTH - 60) + 30,
                        y: Math.random() * (topLimit - 80) + 60
                    };
                }
                
                // Move towards target
                const dx = e.targetPos.x - e.x;
                const dy = e.targetPos.y - e.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist > 5) {
                    // Fast movement
                    e.x += (dx / dist) * 4; // Speed 4
                    e.y += (dy / dist) * 4;
                } else {
                    // Reached. Wait random frames then pick new
                    if (!e.patternTimer) e.patternTimer = 0;
                    // Using a separate timer property on the fly or repurposing one is risky
                    // Let's use modulus of frame
                    if (state.frame % 120 === 0) {
                        e.targetPos = null; // Reset to pick new
                    }
                }

                // Hard clamp
                if (e.y > topLimit) e.y = topLimit;

            } else if (e.variant === 'gamma' || e.variant === 'delta' || e.variant === 'theta') {
                // ... Keep existing movement ...
                if (e.variant === 'gamma') { e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.01) * 100; e.y = 80; }
                else if (e.variant === 'delta') { e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.02) * 50; e.y = 120 + Math.sin(t * 0.05) * 20; }
                else if (e.variant === 'theta') { e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.01) * 150; e.y = 100 + Math.sin(t * 0.02) * 20; }
            } else if (e.variant === 'alpha') {
                // ALPHA MOVEMENT LOGIC (Restored)
                // Vertical Hover: Bobs up and down gently
                const hoverY = 120 + Math.sin(state.frame * 0.03) * 30;
                // Horizontal Sway: Moves left and right across the top of the screen
                e.x = CANVAS_WIDTH / 2 + Math.sin(state.frame * 0.015) * 180;
                // Smoothly interpolate Y position
                e.y += (hoverY - e.y) * 0.05;
            } else {
                // Fallback for any unknown boss
                const hoverY = 120 + Math.sin(t * 0.03) * 30; e.x = CANVAS_WIDTH / 2 + Math.sin(t * 0.015) * 180; e.y += (hoverY - e.y) * 0.05; 
            }
         }

         // Theta Minion Spawns
         if (e.variant === 'theta') {
             // ... existing theta logic ...
             if (e.shieldActive) {
                 e.shieldTimer = (e.shieldTimer || 0) + 1;
                 if (e.shieldTimer > 1200) { e.shieldActive = false; e.shieldTimer = 0; }
                 if ((e.shieldHp || 0) <= 0) { e.shieldActive = false; e.shieldTimer = 0; }
             } else {
                 e.shieldTimer = (e.shieldTimer || 0) + 1;
                 if (e.shieldTimer > 480) { e.shieldActive = true; e.shieldHp = e.maxHp * 0.08; e.shieldMax = e.maxHp * 0.08; e.shieldTimer = 0; }
             }
             if (state.frame % 360 === 0 && e.hp > e.maxHp * 0.05) { 
                 // ... spawn logic ...
                 let currentOrbitCount = state.enemies.filter(en => en.type === 'oracle_minion' && en.variant === 'alpha').length;
                 let currentHorizCount = state.enemies.filter(en => en.type === 'oracle_minion' && en.variant === 'beta').length;
                 const hpCost = e.maxHp * (isPhase2 ? 0.005 : 0.01); e.hp -= hpCost; const minionHp = e.maxHp * 0.03; 
                 for(let m=0; m<3; m++) {
                     if (currentOrbitCount >= 13 && currentHorizCount >= 7) break;
                     let isOrbit = Math.random() > 0.3; if (currentHorizCount >= 7) isOrbit = true; if (currentOrbitCount >= 13) isOrbit = false;
                     const orbitAngle = isOrbit ? (Math.PI*2/3)*m : 0; const orbitRadius = isOrbit ? 80 : 0; const orbitSpeed = isOrbit ? 0.03 : 0;
                     const direction = Math.random() > 0.5 ? 1 : -1; const vx = isOrbit ? 0 : (2 + Math.random()) * direction; const vy = isOrbit ? 0 : 0.5; 
                     state.enemies.push({ id: `oracle_minion_${Date.now()}_${m}`, x: e.x, y: e.y, width: 12, height: 12, vx: vx, vy: vy, color: '#ffd700', dead: false, hp: minionHp, maxHp: minionHp, type: 'oracle_minion', scoreValue: 500, patternTimer: 0, shotTimer: Math.random() * 60, parentId: e.id, orbitAngle: orbitAngle, orbitRadius: orbitRadius, orbitSpeed: orbitSpeed, variant: isOrbit ? 'alpha' : 'beta' });
                     if (isOrbit) currentOrbitCount++; else currentHorizCount++;
                 }
             }
         }

         // Alptraum Shield Mechanic
         if (e.variant === 'alptraum') {
             e.shieldTimer = (e.shieldTimer || 0) + 1;
             if (e.shieldActive) {
                 // 15 seconds uptime (was 20s for oracle)
                 if (e.shieldTimer > 900) { e.shieldActive = false; e.shieldTimer = 0; }
                 if ((e.shieldHp || 0) <= 0) { e.shieldActive = false; e.shieldTimer = 0; }
             } else {
                 // 10 seconds cooldown
                 if (e.shieldTimer > 600) { 
                     e.shieldActive = true; 
                     e.shieldHp = e.maxHp * 0.15; // 15% Max HP Shield
                     e.shieldMax = e.maxHp * 0.15;
                     e.shieldTimer = 0; 
                 }
             }
         }

         // --- ATTACK LOGIC ---
         let fireRate = state.difficulty === Difficulty.HARD || state.difficulty === Difficulty.BOSS_RUSH || state.difficulty === Difficulty.BOSS_RUSH_EXTREME ? 25 : state.difficulty === Difficulty.EASY ? 60 : state.difficulty === Difficulty.EXTREME ? 15 : 45;
         
         // Adjust Fire Rate per boss
         if (e.variant === 'gamma') fireRate = Math.floor(fireRate * 0.75);
         if (e.variant === 'delta') { /* ... seraph logic ... */ }
         if (e.variant === 'somniomancer' && e.type === 'boss_clone') fireRate = 40; // Clone shoots constant speed
         if (e.variant === 'alptraum') fireRate = 30; // Base rate for Alptraum

         // Determine Phase independently for high-frequency logic
         const standardPhase = Math.floor(state.frame / 600) % 3;
         let currentPhase = standardPhase;
         if (e.type === 'boss_clone') {
             currentPhase = Math.floor(state.frame / 300) % 2;
         }

         // Adjust fireRate based on phase for specific adjustments
         if (e.variant === 'somniomancer' && currentPhase === 2) fireRate /= 2; // Increase frequency 2x for Spiral
         if (e.variant === 'revenant' && currentPhase === 1) fireRate *= 1.6; // Decrease frequency to 62.5% for Mines
         
         // Independent High Frequency Logic (Somniomancer Phase 1)
         if (e.variant === 'somniomancer' && currentPhase === 1) {
             if (state.frame % 20 === 0) {
                  // A2: Huge Purple Rain (High Frequency)
                  state.bullets.push({
                      id: `somnio_huge_${Math.random()}`, x: e.x, y: e.y, width: 36, height: 72,
                      vx: (Math.random() - 0.5) * 1, vy: 1.2, 
                      color: '#9d00ff', dead: false, owner: 'enemy', damage: 25, timer: 0
                  });
             }
         }

         if (e.shotTimer > fireRate) {
            e.shotTimer = 0;
            
            if (e.variant === 'somniomancer') {
               // SOMNIOMANCER REWORK
               if (currentPhase === 0) {
                   // A1: Vortex Waves (Existing white/purple mix, keeping as 'shining bullets')
                   // Increased density (1.25x of 10 -> ~13)
                   for(let i=0; i<13; i++) {
                       const angle = (state.frame * 0.05) + (i * Math.PI / 6.5);
                       state.bullets.push({ 
                           id: `sb_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, 
                           vx: Math.cos(angle)*2, vy: Math.sin(angle)*2, 
                           color: '#9d00ff', dead: false, owner: 'enemy', damage: 15, timer: 0, 
                           isVortex: true 
                       });
                   }
               } else if (currentPhase === 1) {
                   // A2: Handled outside for high frequency
               } else {
                   // A3: Spiral Entry (Bullets from center)
                   const count = 6;
                   for(let k=0; k<count; k++) {
                       const angle = (state.frame * 0.1) + (k * (Math.PI * 2 / count));
                       state.bullets.push({ 
                           id: `somnio_spiral_${Math.random()}`, x: e.x, y: e.y, width: 12, height: 12, 
                           vx: Math.cos(angle)*2, vy: Math.sin(angle)*2, 
                           color: '#5500aa', dead: false, owner: 'enemy', damage: 15, timer: 0
                       });
                   }
               }

            } else if (e.variant === 'revenant') {
               // REVENANT REWORK
               if (currentPhase === 0) {
                   // A1: Slowing Shotgun (Modified)
                   const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                   for(let i=-2; i<=2; i++) {
                       state.bullets.push({ 
                           id: `rev_sg_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, 
                           vx: Math.cos(angle + i*0.2)*6, vy: Math.sin(angle + i*0.2)*6, 
                           color: '#ff0000', dead: false, owner: 'enemy', damage: 20, timer: 0,
                           deceleration: 0.96 // Slow down logic handled in update
                       });
                   }
               } else if (currentPhase === 1) {
                   // A2: Mines
                   const targetX = Math.random() * (CANVAS_WIDTH - 40) + 20;
                   const targetY = Math.random() * (CANVAS_HEIGHT - 100) + 50; // ANYWHERE
                   const angle = Math.atan2(targetY - e.y, targetX - e.x);
                   state.bullets.push({ 
                       id: `rev_mine_${Math.random()}`, x: e.x, y: e.y, width: 12, height: 12, 
                       vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, 
                       color: '#aa0000', dead: false, owner: 'enemy', damage: 30, timer: 0,
                       isMine: true, hp: 50, maxHp: 50, deceleration: 0.98 
                   });
               } else {
                   // A3: Bullet Rain
                   if (state.frame % 5 === 0) { 
                       state.bullets.push({ 
                           id: `rev_rain_${Math.random()}`, x: Math.random() * CANVAS_WIDTH, y: -10, width: 4, height: 8, 
                           vx: 0, vy: 4, // Slow
                           color: '#880000', dead: false, owner: 'enemy', damage: 15, timer: 0,
                           explodeOnWall: true
                       });
                   }
               }

            } else if (e.variant === 'alptraum') {
               // ALPTRAUM COMPLETE REDESIGN

               // Clean up minions if boss inactive
               if (!state.bossActive) {
                   e.trinityActive = false;
                   e.duoActive = false;
               }
               
               // Check Active Sub-Routines
               const trinityMembers = state.enemies.filter(en => en.type === 'alp_mini_boss' && ['alpha','beta','gamma'].includes(en.variant || '') && !en.dead);
               const duoMembers = state.enemies.filter(en => en.type === 'alp_mini_boss' && ['delta','theta'].includes(en.variant || '') && !en.dead);

               // Attack 2: Trinity Logic Handling (Stateful)
               if (e.trinityActive) {
                   e.trinityTimer = (e.trinityTimer || 0) - 1;
                   if (e.trinityTimer <= 0 || trinityMembers.length === 0) {
                       e.trinityActive = false;
                       // Kill remaining if time ran out
                       trinityMembers.forEach(m => m.dead = true);
                   }
                   return; 
               }

               // Attack 3: Duo Logic Handling (Stateful)
               if (e.duoActive) {
                   e.duoTimer = (e.duoTimer || 0) - 1;
                   if (e.duoTimer <= 0 || duoMembers.length === 0) {
                       e.duoActive = false;
                       duoMembers.forEach(m => m.dead = true);
                       // Kill sub-minions of Delta
                       state.enemies.filter(sub => sub.type === 'seraph_drone' && duoMembers.some(d => d.id === sub.parentId)).forEach(s => s.dead = true);
                   }
                   return;
               }

               // Attack Pattern Selector
               // 0: Reflector Rain
               // 1: Trinity Summon (Alpha/Beta/Gamma)
               // 2: Duo Summon (Delta/Theta) - Replaces Sweeping Lasers
               let pattern;
                const rand = Math.random();
                pattern = rand < 0.33 ? 0 : rand < 0.66 ? 1 : 2;
               

               if (pattern === 0) {
                   // ATTACK 1: REFLECTOR RAIN
                   // Spawn 30 Reflectors (Capped at 30 now)
                   e.summonBatchCount = e.summonBatchCount || 0; 
                   const currentReflectors = state.enemies.filter(en => en.type === 'alp_reflector').length;
                   
                   // Increased spawn rate and cap
                   if (state.frame % 5 === 0 && e.summonBatchCount < 30 && currentReflectors < 30) {
                       e.summonBatchCount++;
                       state.enemies.push({
                           id: `alp_ref_${Math.random()}`,
                           x: e.x, y: e.y,
                           width: 20, height: 20,
                           vx: (Math.random()-0.5)*6, vy: 3 + Math.random()*2, // Faster spread
                           color: '#fff', dead: false, hp: 500, maxHp: 500, 
                           type: 'alp_reflector', scoreValue: 50, patternTimer: 0, shotTimer: 0,
                           isReflecting: true 
                       });
                   }
                   
                   // Periodic Rain 
                   if (state.frame % 5 === 0) {
                       for (let k = 0; k < 3; k++) {
                           const rx = Math.random() * CANVAS_WIDTH;
                           const spread = (Math.random() - 0.5) * 10 * (Math.PI/180); 
                           const angle = Math.PI / 2 + spread;
                           state.bullets.push({ 
                               id: `alp_rain_${Math.random()}`, x: rx, y: -10, width: 5, height: 10, 
                               vx: Math.cos(angle)*4, vy: Math.sin(angle)*4,
                               color: '#ff00ff', dead: false, owner: 'enemy', damage: 15, timer: 0
                           });
                       }
                   }
                   if (state.frame % 600 === 599) e.summonBatchCount = 0;

               } else if (pattern === 1) {
                   // ATTACK 2: TRINITY
                   if (!e.trinityActive) {
                       const cost = e.maxHp * 0.15;
                       if (e.hp > cost) {
                           e.hp -= cost;
                           e.trinityActive = true;
                           e.trinityTimer = 1200;
                           // REMOVED NOTIFICATION BANNER
                           
                           const miniHp = e.maxHp * 0.15; // Increased by 50% from 0.10
                           const minis = ['alpha', 'beta', 'gamma'];
                           minis.forEach((v, idx) => {
                               state.enemies.push({
                                   id: `alp_mini_${v}_${Date.now()}`,
                                   x: e.x, y: e.y,
                                   width: 25, height: 25,
                                   vx: 0, vy: 0,
                                   color: v === 'alpha' ? '#ff0055' : v === 'beta' ? '#ffff00' : '#5500ff',
                                   dead: false, hp: miniHp, maxHp: miniHp,
                                   type: 'alp_mini_boss', scoreValue: 1000,
                                   patternTimer: 0, shotTimer: 0,
                                   parentId: e.id,
                                   orbitAngle: (Math.PI*2/3) * idx,
                                   variant: v as any
                               });
                           });
                       } else {
                           currentPhase = 2; // Fallback
                       }
                   }

               } else {
                   // ATTACK 3: DUO (SERAPH & ORACLE)
                   if (!e.duoActive) {
                       const cost = e.maxHp * 0.15;
                       if (e.hp > cost) {
                           e.hp -= cost;
                           e.duoActive = true;
                           e.duoTimer = 1200; 
                           // REMOVED NOTIFICATION BANNER

                           const miniHp = e.maxHp * 0.225;
                           const minis = ['delta', 'theta']; // Seraph, Oracle
                           minis.forEach((v, idx) => {
                               state.enemies.push({
                                   id: `alp_mini_${v}_${Date.now()}`,
                                   x: e.x, y: e.y,
                                   width: 30, height: 30,
                                   vx: 0, vy: 0,
                                   color: v === 'delta' ? '#ffffff' : '#ffd700', // White / Gold
                                   dead: false, hp: miniHp, maxHp: miniHp,
                                   type: 'alp_mini_boss', scoreValue: 1200,
                                   patternTimer: 0, shotTimer: 0,
                                   parentId: e.id,
                                   orbitAngle: (Math.PI) * idx, // Opposite sides
                                   variant: v as any
                               });
                           });
                       } else {
                           // MG Fallback if low HP
                           if (state.frame % 5 === 0) {
                               const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                               state.bullets.push({ 
                                   id: `alp_mg_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, 
                                   vx: Math.cos(angle)*8, vy: Math.sin(angle)*8, 
                                   color: '#00ffff', dead: false, owner: 'enemy', damage: 15, timer: 0
                               });
                           }
                       }
                   }
               }

            } else {
                // ... Existing Boss Logic (Alpha, Beta, Gamma, Delta, Theta) ...
                // Re-using the patterns from the provided file to avoid breaking them
                // Alpha, Beta, Gamma, Delta, Theta
                 if (e.variant === 'beta') {
                    if (currentPhase === 0) { 
                       const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                       for(let i=-1; i<=1; i++) { state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 5, height: 5, vx: Math.cos(angle + i*0.3)*3, vy: Math.sin(angle + i*0.3)*3, color: '#ffff00', dead: false, owner: 'enemy', damage: 10, timer: 0 }); }
                    } else if (currentPhase === 1) { 
                       const t = (state.frame % 100) / 100; const angle = Math.PI/2 + (t - 0.5);
                       state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, color: '#ffff00', dead: false, owner: 'enemy', damage: 10, timer: 0 });
                       state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: Math.cos(angle + Math.PI)*4, vy: Math.sin(angle + Math.PI)*4, color: '#ffff00', dead: false, owner: 'enemy', damage: 10, timer: 0 });
                    } else { state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, color: '#ffff00', dead: false, owner: 'enemy', damage: 15, timer: 0 }); }
                } else if (e.variant === 'gamma') {
                    const dmgMult = isPhase2 ? 1.5 : 1.0;
                    if (currentPhase === 0) { const arms = 8; for(let i=0; i<arms; i++) { const angle = (state.frame * 0.05) + (i * (Math.PI * 2 / arms)); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 12, height: 12, vx: Math.cos(angle)*1.5, vy: Math.sin(angle)*1.5, color: '#5500ff', dead: false, owner: 'enemy', damage: 25 * dmgMult, timer: 0 }); } }
                    else if (currentPhase === 1) { const offset = (state.frame % 200) < 100 ? 0 : 20; state.bullets.push({ id: `eb_${Math.random()}`, x: offset + (state.frame%20)*30, y: 0, width: 8, height: 20, vx: 0, vy: 3, color: '#5500ff', dead: false, owner: 'enemy', damage: 20 * dmgMult, timer: 0 }); }
                    else { const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 20, height: 20, vx: Math.cos(angle)*1, vy: Math.sin(angle)*1, color: '#5500ff', dead: false, owner: 'enemy', damage: 30 * dmgMult, timer: 0 }); }
                } else if (e.variant === 'delta') { 
                   if (currentPhase === 0) { if (state.frame % 3 === 0) state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 40, height: 10, vx: 0, vy: 5, color: '#ffffff', dead: false, owner: 'enemy', damage: 40, timer: 0 }); }
                   else if (currentPhase === 1) { for(let k=0; k<2; k++) { const angle = Math.PI/2 + (Math.random()-0.5); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 12, vx: Math.cos(angle)*3, vy: Math.sin(angle)*3, color: '#ffffff', dead: false, owner: 'enemy', damage: 15, timer: 0 }); } }
                   else { state.bullets.push({ id: `eb_${Math.random()}`, x: e.x-50, y: e.y, width: 8, height: 8, vx: -1, vy: 3, color: '#ffffff', dead: false, owner: 'enemy', damage: 15, timer: 0 }); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x+50, y: e.y, width: 8, height: 8, vx: 1, vy: 3, color: '#ffffff', dead: false, owner: 'enemy', damage: 15, timer: 0 }); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x-25, y: e.y+10, width: 8, height: 8, vx: -0.5, vy: 3, color: '#ffffff', dead: false, owner: 'enemy', damage: 15, timer: 0 }); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x+25, y: e.y+10, width: 8, height: 8, vx: 0.5, vy: 3, color: '#ffffff', dead: false, owner: 'enemy', damage: 15, timer: 0 }); }
                } else if (e.variant === 'theta') { 
                   const angle = Math.random() * Math.PI * 2; state.bullets.push({ id: `fb_${Math.random()}`, x: e.x, y: e.y, width: 10, height: 10, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, color: '#ffd700', dead: false, owner: 'enemy', damage: 20, timer: 0, isFirework: true });
                } else if (e.variant === 'alpha') {
                    // ALPHA ATTACK PATTERNS (Restored)
                    const runPattern0 = () => {
                        // PHASE 1: SPINNING FLOWER
                        const arms = 6;
                        for(let i=0; i<arms; i++) {
                            const angle = (state.frame * 0.1) + (i * (Math.PI * 2 / arms));
                            state.bullets.push({ 
                                id: `eb_p0_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, 
                                vx: Math.cos(angle)*2.0, vy: Math.sin(angle)*2.0, 
                                color: '#ff0055', dead: false, owner: 'enemy', damage: 15, timer: 0 
                            });
                        }
                    };
                    const runPattern1 = () => {
                         // PHASE 2: TRIPLE AIMED STREAM
                         const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
                         for(let i=-1; i<=1; i++) {
                             state.bullets.push({ 
                                 id: `eb_p1_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, 
                                 vx: Math.cos(angle + i*0.1)*3, vy: Math.sin(angle + i*0.1)*3, 
                                 color: '#ff0055', dead: false, owner: 'enemy', damage: 15, timer: 0 
                             });
                         }
                    };
                    const runPattern2 = () => {
                        // PHASE 3: RANDOM CHAOS
                        state.bullets.push({ 
                            id: `eb_p2_${Math.random()}`, x: e.x + (Math.random()-0.5)*100, y: e.y, width: 10, height: 10, 
                            vx: (Math.random()-0.5)*2.0, vy: (Math.random()+0.5)*1.5, 
                            color: '#ff0055', dead: false, owner: 'enemy', damage: 15, timer: 0 
                        });
                    };

                    let patternsToRun: number[] = [];
                    // Check if boss is in Phase 2 (HP < 40%)
                    if (e.phase === 2) {
                        // Phase 2: Select 2 random attacks
                        const available = [0, 1, 2];
                        const p1 = available.splice(Math.floor(Math.random() * available.length), 1)[0];
                        const p2 = available.splice(Math.floor(Math.random() * available.length), 1)[0];
                        patternsToRun = [p1, p2];
                    } else {
                        // Normal behavior: Cycle patterns
                        patternsToRun = [Math.floor(state.frame / 600) % 3];
                    }

                    patternsToRun.forEach(p => {
                        if (p === 0) runPattern0();
                        else if (p === 1) runPattern1();
                        else if (p === 2) runPattern2();
                    });
                }
            }
         }

      } else if (e.type === 'alp_mini_boss') {
          // MINI BOSS LOGIC
          const fireRateMod = 0.5; // Faster (was 2)
          
          // DELTA (Seraph) Special Logic: Spawn Drones
          if (e.variant === 'delta') {
              const children = state.enemies.filter(c => c.parentId === e.id && c.type === 'seraph_drone');
              if (children.length < 4 && state.frame % 60 === 0) {
                  state.enemies.push({
                     id: `alp_seraph_drone_${Math.random()}`,
                     x: e.x, y: e.y, width: 10, height: 10, vx:0, vy:0, color:'#ccffff', dead:false, hp:50, maxHp:50,
                     type: 'seraph_drone', scoreValue:0, patternTimer:0, shotTimer:0,
                     parentId: e.id, orbitAngle: (Math.PI/2)*children.length, orbitRadius: 40, orbitSpeed: 0.05
                  });
              }
          }

          let threshold = 60 * fireRateMod;
          // Construct (Alpha) & Oracle (Theta): 2/3 frequency => 1.5x period
          if (e.variant === 'alpha' || e.variant === 'theta') threshold *= 1.5;
          // Titan (Gamma): 50% frequency => 2x period
          if (e.variant === 'gamma') threshold *= 2;
          // Viper (Beta): 1/3 frequency => 3x period
          if (e.variant === 'beta') threshold *= 3;

          if (e.shotTimer > threshold) {
              e.shotTimer = 0;
              const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
              
              if (e.variant === 'alpha') {
                  // Alpha: Circular Expanding Ring
                  // Damage halved (10 -> 5)
                  for(let i=0; i<12; i++) {
                      const a = (Math.PI * 2 / 12) * i;
                      state.bullets.push({ id: `mini_a_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, vx: Math.cos(a)*4, vy: Math.sin(a)*4, color: e.color, dead: false, owner: 'enemy', damage: 5, timer: 0 });
                  }
              } else if (e.variant === 'beta') {
                  // Beta: Sine Wave Stream
                  // Damage halved (10 -> 5)
                  for(let i=0; i<3; i++) {
                      state.bullets.push({ 
                          id: `mini_b_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, 
                          vx: Math.cos(angle)*6, vy: Math.sin(angle)*6, 
                          color: e.color, dead: false, owner: 'enemy', damage: 5, timer: i*5, // offset start
                          initialX: e.x 
                      });
                  }
                  // Override: Rapid Machine Gun burst. Damage halved (8 -> 4)
                  state.bullets.push({ id: `mini_b_fast_${Math.random()}`, x: e.x, y: e.y, width: 5, height: 5, vx: Math.cos(angle)*8, vy: Math.sin(angle)*8, color: e.color, dead: false, owner: 'enemy', damage: 4, timer: 0 });

              } else if (e.variant === 'gamma') {
                  // Gamma: Heavy Shotgun
                  // Decrease bullets to 4 (was 5). 75% slower (speed * 0.25). Damage 50% (20 -> 10).
                  const offsets = [-0.3, -0.1, 0.1, 0.3];
                  for(let i=0; i<4; i++) {
                      // speed 3 * 0.25 = 0.75
                      state.bullets.push({ id: `mini_g_${Math.random()}`, x: e.x, y: e.y, width: 14, height: 14, vx: Math.cos(angle + offsets[i])*0.75, vy: Math.sin(angle + offsets[i])*0.75, color: e.color, dead: false, owner: 'enemy', damage: 10, timer: 0 });
                  }
              } else if (e.variant === 'delta') {
                  // Delta: Just fires simple support
                  // Damage halved (10 -> 5)
                  state.bullets.push({ id: `mini_d_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, color: e.color, dead: false, owner: 'enemy', damage: 5, timer: 0 });
              } else if (e.variant === 'theta') {
                  // Theta: Homing Shot. Damage halved (12 -> 6)
                  state.bullets.push({ 
                      id: `mini_t_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, 
                      vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, 
                      color: e.color, dead: false, owner: 'enemy', damage: 6, timer: 0,
                      homingTargetId: state.player.id 
                  });
                  // Firework shell. Damage halved (15 -> 7.5)
                  if (Math.random() > 0.5) {
                      state.bullets.push({ id: `mini_t_fw_${Math.random()}`, x: e.x, y: e.y, width: 10, height: 10, vx: Math.cos(angle)*5, vy: Math.sin(angle)*5, color: '#ffd700', dead: false, owner: 'enemy', damage: 7.5, timer: 0, isFirework: true });
                  }
              }
          }

      } else if (e.type === 'alp_reflector') {
          // Special Reflector: Moves down slowly, periodic shield
          e.y += 0.5 * state.timeScale;
          e.patternTimer++;
          if (e.patternTimer > 300) { 
              e.isReflecting = !e.isReflecting; 
              e.patternTimer = 0; 
              if (e.isReflecting) { state.particles.push({ id: `ref_pop_${Math.random()}`, x: e.x, y: e.y, width: 30, height: 30, vx:0, vy:0, color:'#fff', life:20, maxLife:20, alpha:0.5, dead:false}); } 
          }

      } else if (e.type === 'seraph_drone') {
          // ... Existing Drone Logic ...
          if (e.parentId) {
             const parent = state.enemies.find(p => p.id === e.parentId);
             if (parent && !parent.dead) {
                 e.orbitAngle = (e.orbitAngle || 0) + (e.orbitSpeed || 0.05);
                 e.x = parent.x + Math.cos(e.orbitAngle) * (e.orbitRadius || 100);
                 e.y = parent.y + Math.sin(e.orbitAngle) * (e.orbitRadius || 100);
                 // Check boss phase ONLY if parent is a boss, otherwise default
                 const isPhase2 = parent.phase === 2; // mini-bosses have no phase prop, undefined is falsy
                 const fireThreshold = isPhase2 ? 60 : 120;
                 if (e.shotTimer > fireThreshold) { e.shotTimer = 0; const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); state.bullets.push({ id: `db_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: Math.cos(angle)*2, vy: Math.sin(angle)*2, color: '#ccffff', dead: false, owner: 'enemy', damage: 8, timer: 0 }); }
             } else { e.dead = true; }
          }
      } else if (e.type === 'oracle_minion') {
          // ... Existing Minion Logic ...
          const parent = state.enemies.find(p => p.id === e.parentId);
          if (e.variant === 'alpha') {
              if (parent && !parent.dead) { e.orbitAngle = (e.orbitAngle || 0) + (e.orbitSpeed || 0.03); e.x = parent.x + Math.cos(e.orbitAngle) * (e.orbitRadius || 80); e.y = parent.y + Math.sin(e.orbitAngle) * (e.orbitRadius || 80); } 
              else { e.x += Math.cos(e.orbitAngle || 0) * 1; e.y += Math.sin(e.orbitAngle || 0) * 1; }
              if (e.shotTimer > 120) { e.shotTimer = 0; const angle = Math.random() > 0.5 ? Math.atan2(state.player.y - e.y, state.player.x - e.x) : Math.random() * Math.PI * 2; state.bullets.push({ id: `omb_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, color: '#ffaa00', dead: false, owner: 'enemy', damage: 8, timer: 0 }); }
          } else {
              e.x += e.vx; e.y += e.vy; if (e.x < 10 || e.x > CANVAS_WIDTH - 10) e.vx *= -1;
              if (e.shotTimer > 60) { e.shotTimer = 0; state.bullets.push({ id: `omb_bomb_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: 0, vy: 4, color: '#ff5500', dead: false, owner: 'enemy', damage: 10, timer: 0 }); }
          }
      } else {
         // STANDARD MOBS LOGIC (Unchanged)
         // ... (Keeping exact logic from original file for standard mobs to satisfy constraint "No changes to other bots")
         if (e.type === 'drone') { e.y += 2 * state.timeScale; e.x += Math.sin(e.patternTimer * 0.05) * 3 * state.timeScale; if (e.shotTimer > 120) { e.shotTimer = 0; const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 5, height: 5, vx: Math.cos(angle)*2, vy: Math.sin(angle)*2, color: '#ff00aa', dead: false, owner: 'enemy', damage: 10, timer: 0 }); } }
         else if (e.type === 'tank') { e.y += 0.8 * state.timeScale; if (e.shotTimer > 90) { e.shotTimer = 0; for(let i=-1; i<=1; i++) { state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 8, height: 8, vx: i*1.5, vy: 3, color: '#ffaa00', dead: false, owner: 'enemy', damage: 15, timer: 0 }); } } }
         else if (e.type === 'interceptor') { if (e.patternTimer < 60) { e.y += 3 * state.timeScale; } else { if (e.vx === 0) e.vx = (state.player.x > e.x ? 1 : -1) * 4; e.x += e.vx * state.timeScale; e.y += 4 * state.timeScale; } }
         else if (e.type === 'seeker') { const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); e.x += Math.cos(angle) * 3 * state.timeScale; e.y += Math.sin(angle) * 3 * state.timeScale; }
         else if (e.type === 'stealth') { e.y += 1.5 * state.timeScale; if (e.shotTimer > 150) { e.shotTimer = 0; state.bullets.push({ id: `eb_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: 0, vy: 5, color: '#444444', dead: false, owner: 'enemy', damage: 20, timer: 0 }); } }
         else if (e.type === 'illusion_clone') { e.y += 2 * state.timeScale; if (e.y > CANVAS_HEIGHT) e.dead = true; } 
         else if (e.type === 'gorgon') { e.y += 0.5 * state.timeScale; if (e.shotTimer > 180) { e.laserCharge = (e.laserCharge || 0) + 1; if (e.laserCharge === 1) { const baseAngle = Math.atan2(state.player.y - e.y, state.player.x - e.x); e.targetAngle = baseAngle + (Math.random() - 0.5) * (Math.PI / 2); } if (e.laserCharge > 60) { e.burstCount = 7; e.shotTimer = 0; e.laserCharge = 0; } } if ((e.burstCount || 0) > 0 && state.frame % 5 === 0) { e.burstCount = (e.burstCount || 0) - 1; const fireAngle = e.targetAngle || Math.atan2(state.player.y - e.y, state.player.x - e.x); state.bullets.push({ id: `gorgon_laser_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: Math.cos(fireAngle) * 15, vy: Math.sin(fireAngle) * 15, color: '#0055ff', dead: false, owner: 'enemy', damage: 30, timer: 0 }); } }
         else if (e.type === 'kamikaze') { const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); e.vx += Math.cos(angle) * 0.2; e.vy += Math.sin(angle) * 0.2; const speed = Math.sqrt(e.vx*e.vx + e.vy*e.vy); if (speed > 5) { e.vx *= 0.9; e.vy *= 0.9; } e.x += e.vx * state.timeScale; e.y += e.vy * state.timeScale; const dist = Math.sqrt(Math.pow(state.player.x - e.x, 2) + Math.pow(state.player.y - e.y, 2)); if (dist < 40) { createExplosion(e.x, e.y, 100, 30); if (state.player.invulnerableTime <= 0) { if (state.player.shield && state.player.shield > 0) { state.player.shield -= 30 * incomingDamageMultiplier; state.player.invulnerableTime = 30; } else { state.player.hp -= 30 * incomingDamageMultiplier; state.player.framesSinceLastHit = 0; state.player.invulnerableTime = 60; if (state.player.hp <= 0) { if (state.player.revives > 0) { state.player.revives--; state.player.hp = state.player.maxHp; state.player.invulnerableTime = 120; createExplosion(state.player.x, state.player.y, 200, 500); } else { state.isGameOver = true; onGameOver(state.score, false, state.dataFragments, { totalKills: state.stats.kills, bossesKilled: state.stats.bossKills, totalShotsFired: state.stats.shotsFired, maxStageReached: state.stage }); } } } } e.dead = true; } }
         else if (e.type === 'aegis_bot') { e.y += 1 * state.timeScale; e.shieldTimer = (e.shieldTimer || 0) + 1; if (e.shieldActive && e.shieldTimer > 120) { e.shieldActive = false; e.shieldTimer = 0; } else if (!e.shieldActive && e.shieldTimer > 240) { e.shieldActive = true; e.shieldTimer = 0; } e.dmgReduction = e.shieldActive ? 1.0 : 0; if (e.shotTimer > 90) { e.shotTimer = 0; const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); [-0.35, 0.35].forEach(offset => { state.bullets.push({ id: `ab_${Math.random()}`, x: e.x, y: e.y, width: 6, height: 6, vx: Math.cos(angle + offset)*4, vy: Math.sin(angle + offset)*4, color: '#0088ff', dead: false, owner: 'enemy', damage: 10, timer: 0 }); }); } }
         else if (e.type === 'swarmer') { e.x += Math.sin(e.patternTimer * 0.2) * 5 * state.timeScale; e.y += 4 * state.timeScale; if (e.shotTimer > 60) { e.shotTimer = 0; state.bullets.push({ id: `sb_l_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: -3, vy: 0, color: '#cc00cc', dead: false, owner: 'enemy', damage: 5, timer: 0 }, { id: `sb_r_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: 3, vy: 0, color: '#cc00cc', dead: false, owner: 'enemy', damage: 5, timer: 0 }); } }
         else if (e.type === 'lich') { if (e.patternTimer % 240 === 0) { e.x = Math.random() * (CANVAS_WIDTH - 40) + 20; e.y = Math.random() * 200 + 20; state.enemies.push({ id: `lich_spawn_${Date.now()}`, x: e.x, y: e.y + 20, width: 8, height: 8, vx: 0, vy: 0, color: '#cc00cc', dead: false, hp: 10, maxHp: 10, type: 'swarmer', scoreValue: 50, patternTimer: 0, shotTimer: 0 }); } }
         else if (e.type === 'sniper') { e.x += (Math.sin(state.frame * 0.01) * 1) * state.timeScale; if (e.y < 50) e.y += 1; e.invulnTimer = (e.invulnTimer || 0) + 1; if (e.invulnTimer > 600) e.invulnTimer = 0; e.dmgReduction = (e.invulnTimer > 300) ? 1.0 : 0; if (e.shotTimer > 200) { e.laserCharge = (e.laserCharge || 0) + 1; if (e.laserCharge > 90) { const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); state.bullets.push({ id: `sniper_shot_${Math.random()}`, x: e.x, y: e.y, width: 4, height: 4, vx: Math.cos(angle)*25, vy: Math.sin(angle)*25, color: '#ff0000', dead: false, owner: 'enemy', damage: 40, timer: 0, piercing: true, hasTrace: true }); e.shotTimer = 0; e.laserCharge = 0; } } }
         else if (e.type === 'reflector') { e.y += 0.5 * state.timeScale; e.patternTimer++; if (e.patternTimer > 300) { e.isReflecting = !e.isReflecting; e.patternTimer = 0; if (e.isReflecting) { state.particles.push({ id: `ref_pop_${Math.random()}`, x: e.x, y: e.y, width: 60, height: 60, vx:0, vy:0, color:'#fff', life:20, maxLife:20, alpha:0.5, dead:false}); } } }
         else if (e.type === 'breacher') { e.y += 0.8 * state.timeScale; if (e.shotTimer > 120) { e.shotTimer = 0; const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x); const distToPlayer = Math.sqrt(Math.pow(state.player.x - e.x, 2) + Math.pow(state.player.y - e.y, 2)); for(let i=-2; i<=2; i++) { let baseSpeed = 10 + Math.random() * 6; if (distToPlayer < 250) { baseSpeed = 4 + (distToPlayer / 250) * 6; } const size = 6 + Math.random() * 4; state.bullets.push({ id: `breach_${Math.random()}`, x: e.x, y: e.y, width: size, height: size, vx: Math.cos(angle + i*0.15) * baseSpeed, vy: Math.sin(angle + i*0.15) * baseSpeed, color: '#ff8800', dead: false, owner: 'enemy', damage: 15, timer: 0, deceleration: 0.98 }); } } }
      }

      // Check Bounds
      if (e.type !== 'boss' && e.type !== 'boss_clone' && e.type !== 'drone') {
          if (e.y > CANVAS_HEIGHT + 50 || e.x < -50 || e.x > CANVAS_WIDTH + 50) e.dead = true;
      } else if (e.type === 'boss') {
          if (e.y > CANVAS_HEIGHT + 300) e.dead = true;
      }
    });

    state.bullets.forEach(b => {
      b.timer++;
      
      // Deceleration Logic
      if (b.deceleration) {
          b.vx *= b.deceleration;
          b.vy *= b.deceleration;
          
          if (b.isMine) {
              const speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
              if (speed < 0.5) { b.vx = 0; b.vy = 0; }
          } else {
              // Breacher/Shotgun style - min speed check
              const speed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
              // Ensure Modified Shotgun bullets don't stop
              if (speed < 3 && !b.isMine) { 
                  const scale = 3 / speed; b.vx *= scale; b.vy *= scale; b.deceleration = 1;
              }
          }
      }

      // Revenant Shotgun Growth
      if (b.id.startsWith('rev_sg_')) {
          b.width = Math.min(20, b.width + 0.05);
          b.height = Math.min(20, b.height + 0.05);
      }
      
      // Laser Beam Visual for Alptraum Attack 3 (Sweeping)
      if (b.isLaser) {
          if (b.id.startsWith('alp_sweep')) {
              // Sweeping laser doesn't thin out immediately, it persists and moves down
              if (b.y > CANVAS_HEIGHT) b.dead = true;
          } else {
              if (b.width > 2) b.width *= 0.95; // Thin out
              if (b.timer > 30) b.dead = true;
          }
      }

      // Mine Logic (Revenant)
      if (b.isMine) {
          // If HP <= 0, explode 6 ways
          if (b.hp !== undefined && b.hp <= 0) {
              b.dead = true;
              createExplosion(b.x, b.y, 40, 0); // visual
              for(let k=0; k<7; k++) {
                  const a = k * (Math.PI*2/7);
                  state.bullets.push({ id: `mine_shard_${Math.random()}`, x: b.x, y: b.y, width: 6, height: 6, vx: Math.cos(a)*4, vy: Math.sin(a)*4, color: '#aa0000', dead: false, owner: 'enemy', damage: 15, timer: 0 });
              }
          } 
          // Timer > 8s or Player close -> explode 8 ways
          const dist = Math.sqrt(Math.pow(state.player.x - b.x, 2) + Math.pow(state.player.y - b.y, 2));
          if (b.timer > 480 || dist < 50) {
              b.dead = true;
              createExplosion(b.x, b.y, 40, 0); // visual
              for(let k=0; k<8; k++) {
                  const a = k * (Math.PI*2/8);
                  state.bullets.push({ id: `mine_shard_${Math.random()}`, x: b.x, y: b.y, width: 6, height: 6, vx: Math.cos(a)*4, vy: Math.sin(a)*4, color: '#aa0000', dead: false, owner: 'enemy', damage: 15, timer: 0 });
              }
          }
      }
      
      // Somniomancer Spawner Logic
      if (b.isSpawner) {
          b.spawnerAngle = (b.spawnerAngle || 0) + 0.2;
          if (b.timer % 15 === 0) { // Reduced frequency (was 5)
              // Spiral
              state.bullets.push({
                  id: `somnio_sub_${Math.random()}`, x: b.x, y: b.y, width: 4, height: 4,
                  vx: Math.cos(b.spawnerAngle)*3, vy: Math.sin(b.spawnerAngle)*3,
                  color: '#9d00ff', dead: false, owner: 'enemy', damage: 10, timer: 0
              });
          }
          if (b.timer > 300) b.dead = true; // Expires
      }
      
      // Alptraum Turret Logic
      if (b.isSpawner && b.id.startsWith('alp_turret')) {
          b.spawnerAngle = (b.spawnerAngle || 0) + 0.3; // Spin fast
          if (b.timer % 2 === 0) {
              // 3 streams
              for (let k=0; k<3; k++) {
                  const a = b.spawnerAngle + (k * Math.PI * 2 / 3);
                  state.bullets.push({
                      id: `turret_shot_${Math.random()}`, x: b.x, y: b.y, width: 4, height: 4,
                      vx: Math.cos(a)*6, vy: Math.sin(a)*6,
                      color: '#fff', dead: false, owner: 'enemy', damage: 15, timer: 0
                  });
              }
          }
          if (b.timer > 180) b.dead = true;
      }

      // Alptraum Bouncing
      if (b.isBouncing && b.owner === 'enemy') {
          // Bounding box collision
          let hitWall = false;
          if (b.x < 0 || b.x > CANVAS_WIDTH) { b.vx *= -1; hitWall = true; }
          if (b.y < 0 || b.y > CANVAS_HEIGHT) { b.vy *= -1; hitWall = true; }
          
          if (hitWall && !b.isReturning) {
              if (b.bouncesLeft && b.bouncesLeft > 0) {
                  b.bouncesLeft--;
              } else {
                  // Return to boss
                  b.isReturning = true;
              }
          }

          if (b.isReturning) {
              const boss = state.enemies.find(e => e.type === 'boss');
              if (boss) {
                  const angle = Math.atan2(boss.y - b.y, boss.x - b.x);
                  b.vx = Math.cos(angle) * 8;
                  b.vy = Math.sin(angle) * 8;
                  
                  const d = Math.sqrt(Math.pow(boss.x - b.x, 2) + Math.pow(boss.y - b.y, 2));
                  if (d < boss.width) b.dead = true; // Absorbed
              } else {
                  b.dead = true;
              }
          }
      }
      
      // Trace Logic
      if (b.hasTrace) {
          if (b.timer % 3 === 0) { 
              state.bullets.push({ id: `trace_${Math.random()}`, x: b.x, y: b.y, width: 3, height: 3, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, color: 'rgba(255,50,50,0.8)', dead: false, owner: 'enemy', damage: 10, timer: 0 });
          }
      }
      if (b.id.startsWith('trace_') && b.timer > 300) b.dead = true;
      
      if (b.owner === 'player') {
         // ... existing player bullet logic (Homing, etc) ...
         // (Abbreviated to keep file size manageable, but keeping critical logic)
         if (b.weaponId === WeaponId.WAVE_MOTION && b.initialX !== undefined) { const isDoubleHelix = b.splashRadius === 1; const offset = isDoubleHelix ? Math.PI : 0; b.x = b.initialX + Math.sin(b.timer * 0.2 + offset) * 40; }
         else if (b.weaponId === WeaponId.ORBITING_ORBS) { if (b.orbitAngle !== undefined && b.orbitRadius !== undefined) { const speed = b.splashRadius || 0.1; b.orbitAngle += speed; b.x = state.player.x + Math.cos(b.orbitAngle) * b.orbitRadius; b.y = state.player.y + Math.sin(b.orbitAngle) * b.orbitRadius; if (b.orbCooldown && b.orbCooldown > 0) { b.orbCooldown--; b.color = '#ffffe0'; } else { b.color = '#ffff00'; } } }
         else if (b.homingTargetId || (b.weaponId === WeaponId.PHASE_BLADES && b.timer > 10)) {
             let target = state.enemies.find(e => e.id === b.homingTargetId);
             if (!target && b.weaponId === WeaponId.PHASE_BLADES) { 
                 // FIXED: Tracer bullets do not target ghost drones
                 target = state.enemies.reduce((nearest, e) => { 
                     if (e.isGhost) return nearest; // Skip ghosts
                     const d = Math.pow(e.x - b.x, 2) + Math.pow(e.y - b.y, 2); 
                     return d < nearest.dist ? {e, dist: d} : nearest; 
                 }, {e: null as Enemy | null, dist: Infinity}).e || undefined; 
                 if (target) b.homingTargetId = target.id; 
             }
             if (target && !target.dead) {
                if (b.weaponId === WeaponId.PHASE_BLADES && state.player.weaponLevels[WeaponId.PHASE_BLADES] >= 3 && b.timer % 30 === 0) { b.x = target.x; b.y = target.y; } else { const dx = target.x - b.x; const dy = target.y - b.y; const dist = Math.sqrt(dx*dx + dy*dy); const homingStrength = b.weaponId === WeaponId.PHASE_BLADES ? 2 : 1; b.vx += (dx/dist) * homingStrength; b.vy += (dy/dist) * homingStrength; const maxV = b.weaponId === WeaponId.PHASE_BLADES ? 15 : 10; const v = Math.sqrt(b.vx*b.vx + b.vy*b.vy); if (v > maxV) { b.vx = (b.vx/v)*maxV; b.vy = (b.vy/v)*maxV; } }
             }
         } else if (b.weaponId === WeaponId.HOMING_NEEDLES && !b.homingTargetId) { 
             const target = state.enemies.reduce((nearest, e) => { 
                 if (e.isGhost) return nearest; // Skip ghosts
                 const d = Math.pow(e.x - b.x, 2) + Math.pow(e.y - b.y, 2); 
                 return d < nearest.dist ? {e, dist: d} : nearest; 
             }, {e: null as Enemy | null, dist: Infinity}).e; 
             if (target) b.homingTargetId = target.id; 
         }
         if (b.isVortex) {
            b.vy *= 0.96; if (Math.abs(b.vy) < 0.2) { b.vy = 0; b.minSpeedReached = true; }
            if (b.minSpeedReached) { b.minSpeedTimer = (b.minSpeedTimer || 0) + 1; if (b.minSpeedTimer > 180) b.dead = true; }
            const pullStrength = b.orbitRadius || 1; const hasDot = b.chainCount === 1; const pullRadius = b.minSpeedReached ? 225 : 150; 
            state.enemies.forEach(e => { if (e.type === 'boss') return; const dx = b.x - e.x; const dy = b.y - e.y; const dist = Math.sqrt(dx*dx + dy*dy); if (dist < pullRadius) { const normalizedDist = dist / pullRadius; const intensity = Math.pow(Math.max(0, 1 - normalizedDist), 2); const force = intensity * 10 * pullStrength; e.x += (dx/dist) * force; e.y += (dy/dist) * force; if (hasDot && state.frame % 10 === 0) e.hp -= 4; } });
         }
      } else {
         if (state.boss?.variant === 'beta' && b.vx === 0 && b.vy === 0 && b.timer > 60) {
            const angle = Math.atan2(state.player.y - b.y, state.player.x - b.x); b.vx = Math.cos(angle)*6; b.vy = Math.sin(angle)*6;
         }
      }

      if (b.weaponId !== WeaponId.ORBITING_ORBS && !b.isSpawner) {
         b.x += b.vx * (b.owner === 'enemy' ? state.timeScale : 1);
         b.y += b.vy * (b.owner === 'enemy' ? state.timeScale : 1);
      }
      
      // Revenant Phase 2 Wall Explosion
      const revenantP2 = state.boss?.variant === 'revenant' && state.boss.phase === 2;
      // Revenant A3 Rain Explosion (always) or Phase 2 (all bullets except mines)
      const shouldExplode = b.explodeOnWall || (revenantP2 && b.owner === 'enemy' && !b.isMine && !b.id.startsWith('rev_rain_sh'));

      if (shouldExplode) {
           if (b.y > CANVAS_HEIGHT - 5 || b.x < 5 || b.x > CANVAS_WIDTH - 5) {
               b.dead = true;
               // Explode Logic
               // If Phase 2 Revenant, just visual explosion (no new bullets)
               if (revenantP2 && !b.explodeOnWall) {
                   createExplosion(b.x, b.y, 40, 0); // Visual only
               } else {
                   // A3 Rain always explodes into ring (defined previously)
                   for(let k=0; k<8; k++) {
                      const a = k * (Math.PI*2/8);
                      state.bullets.push({ id: `rev_rain_sh_${Math.random()}`, x: b.x, y: b.y, width: 4, height: 4, vx: Math.cos(a)*3, vy: Math.sin(a)*3, color: '#ff5500', dead: false, owner: 'enemy', damage: 10, timer: 0 });
                   }
               }
           }
      }
      
      // Firework
      if (b.isFirework && !b.dead) {
         if (b.x < 0 || b.x > CANVAS_WIDTH || b.y > CANVAS_HEIGHT || b.y < -50) {
             b.dead = true;
             for (let k = 0; k < 6; k++) { const angle = (Math.PI * 2 / 6) * k + (Math.random() * 0.5); state.bullets.push({ id: `shatter_${Math.random()}`, x: Math.max(0, Math.min(CANVAS_WIDTH, b.x)), y: Math.max(0, Math.min(CANVAS_HEIGHT, b.y)), width: 4, height: 4, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, color: '#ffff00', dead: false, owner: 'enemy', damage: 10, timer: 0 }); }
         }
      } else {
          // Standard Bullet boundary check (Exempt bouncing bullets and lasers if they are valid)
          if (!b.isBouncing && !b.isSpawner && !b.isLaser && (b.y < -50 || b.y > CANVAS_HEIGHT + 50 || b.x < -50 || b.x > CANVAS_WIDTH + 50)) b.dead = true;
      }
    });

    state.bullets.filter(b => b.owner === 'player').forEach(b => {
      if (b.isVortex) return;

      state.enemies.forEach(e => {
        if (e.dead || b.dead) return;
        if (b.hitList && b.hitList.includes(e.id)) return; 
        
        // Ghost Drones do not have collision
        if (e.isGhost) return;

        // Reflector Logic
        if ((e.type === 'reflector' || e.type === 'alp_reflector') && e.isReflecting) {
            const dist = Math.sqrt(Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
            if (dist < e.width + b.width + 10) { 
                b.dead = true;
                state.bullets.push({ id: `reflect_${Math.random()}`, x: e.x, y: e.y + 10, width: 6, height: 6, vx: 0, vy: 5, color: '#fff', dead: false, owner: 'enemy', damage: 10, timer: 0 });
                state.particles.push({id: `ping_${Math.random()}`, x:b.x, y:b.y, width:3, height:3, vx:0, vy:0, color:'#fff', life:5, maxLife:5, alpha:1, dead:false});
                return;
            }
        }

        // Mine Logic (Player hitting Revenant Mine)
        if (e.type === 'boss' && e.variant === 'revenant') {
            // Check mines collision
             // This loop iterates enemies, but mines are bullets. We need to check mine collision elsewhere or iterate bullets vs bullets (complex).
             // Simpler: iterate bullets again below or inside bullet loop.
        }

        // Shield Logic for Theta AND Alptraum
        if (e.type === 'boss' && (e.variant === 'theta' || e.variant === 'alptraum') && e.shieldActive && (e.shieldHp || 0) > 0) {
            const dist = Math.sqrt(Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
            if (dist < 80) { 
                if (e.shieldHp) e.shieldHp -= b.damage; 
                state.particles.push({ id: `p_${Math.random()}`, x: b.x, y: b.y, width: 2, height: 2, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, color: '#00ffff', life: 5, maxLife: 5, alpha: 1, dead: false }); 
                b.dead = true; 
                return; 
            }
        }

        const dist = Math.sqrt(Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
        if (dist < e.width + b.width) {
          
          if (e.type === 'boss_clone') {
              // Clones take no damage, visual feedback only
              createExplosion(b.x, b.y, 10, 0);
              b.dead = true;
              return;
          }

          const frozenBonus = (e.frozenTimer && e.frozenTimer > 0 && state.player.spellLevels[SpellCardId.STASIS_FIELD] >= 3) ? 1.5 : 1.0;
          let finalDamage = b.damage * frozenBonus;
          if (e.dmgReduction && e.dmgReduction > 0) {
              finalDamage *= (1 - e.dmgReduction);
              if (Math.random() > 0.5) state.particles.push({ id: `p_shield_${Math.random()}`, x: b.x, y: b.y, width: 3, height: 3, vx: (Math.random()-0.5)*3, vy: (Math.random()-0.5)*3, color: '#00ffff', life: 8, maxLife: 8, alpha: 1, dead: false });
          }

          e.hp -= finalDamage;
          state.particles.push({ id: `p_${Math.random()}`, x: b.x, y: b.y, width: 2, height: 2, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, color: '#fff', life: 5, maxLife: 5, alpha: 1, dead: false });

          if (b.weaponId === WeaponId.PULSE_NOVA) { const pulseRate = b.splashRadius || 20; if (b.timer % pulseRate === 0) createExplosion(b.x, b.y, 60, b.damage / 2); }
          if (b.splashRadius && b.weaponId !== WeaponId.ORBITING_ORBS && b.weaponId !== WeaponId.PULSE_NOVA && b.weaponId !== WeaponId.WAVE_MOTION) { createExplosion(b.x, b.y, b.splashRadius, b.damage); if (b.chainCount === -1) { for(let i=0; i<3; i++) { createExplosion(b.x + (Math.random()-0.5)*40, b.y + (Math.random()-0.5)*40, 30, b.damage/2); } } b.dead = true; } else if (b.chainCount && b.chainCount > 0 && b.weaponId !== WeaponId.PULSE_NOVA) { b.chainCount--; b.hitList = [...(b.hitList || []), e.id]; const rangeMult = b.orbitRadius || 1; const nextTarget = state.enemies.find(ne => ne.id !== e.id && !ne.dead && Math.sqrt(Math.pow(ne.x - e.x, 2) + Math.pow(ne.y - e.y, 2)) < 200 * rangeMult); if (nextTarget) { const angle = Math.atan2(nextTarget.y - b.y, nextTarget.x - b.x); b.vx = Math.cos(angle) * 20; b.vy = Math.sin(angle) * 20; b.x = e.x; b.y = e.y; } else { b.dead = true; } } else if (b.piercing) { if (!b.hitList) b.hitList = []; b.hitList.push(e.id); if (b.weaponId === WeaponId.GAUSS_CANNON) { if (b.chainCount !== undefined) { b.chainCount--; if (b.chainCount <= 0) b.dead = true; } } } else if (b.weaponId !== WeaponId.ORBITING_ORBS && b.weaponId !== WeaponId.PULSE_NOVA) { b.dead = true; }

          if (e.hp <= 0 && !e.dead) {
             e.dead = true;
             state.score += e.scoreValue;
             state.stats.kills++; 
             let lootMult = 1; if (state.difficulty === Difficulty.NORMAL) lootMult = 2; else if (state.difficulty === Difficulty.HARD) lootMult = 4; else if (state.difficulty === Difficulty.EXTREME) lootMult = 8; else if (state.difficulty === Difficulty.INFINITY) lootMult = 10; else if (state.difficulty === Difficulty.EASY) lootMult = 1;
             const baseFragments = Math.floor(Math.random() * 3) + 2; const bossRushMult = (state.difficulty === Difficulty.BOSS_RUSH || state.difficulty === Difficulty.BOSS_RUSH_EXTREME) ? 3 : 1; const boosterMult = activeBoosters.has(BoosterId.LOOT_UP) ? 2 : 1;
             state.dataFragments += Math.ceil(baseFragments * lootMult * bossRushMult * boosterMult); 
             if (b.weaponId === WeaponId.PULSE_NOVA && state.player.weaponLevels[WeaponId.PULSE_NOVA] >= 3) { createExplosion(e.x, e.y, 100, 50); }
             if (e.type === 'kamikaze') createExplosion(e.x, e.y, 80, 0); 
             audioService.playExplosion();
             if (e.type === 'boss') {
               state.stats.bossKills++; state.bossActive = false; state.boss = null;
               // Clean up clones
               state.enemies.filter(en => en.type === 'boss_clone' || en.isGhost || en.type === 'alp_mini_boss' || en.type === 'alp_reflector' || en.type === 'seraph_drone').forEach(c => c.dead = true);
               
               if (practiceMode) { state.isGameOver = true; onGameOver(state.score, true, 0, {}); return; }
               state.waveDelay = 120; state.stage++; state.stageTimer = 0; state.score += 10000; refreshMobPool(); 
               const isBossRush = state.difficulty === Difficulty.BOSS_RUSH || state.difficulty === Difficulty.BOSS_RUSH_EXTREME; const maxStages = isBossRush ? 16 : 6; 
               if (state.stage >= maxStages && state.difficulty !== Difficulty.INFINITY) { onGameOver(state.score, true, state.dataFragments, { totalKills: state.stats.kills, bossesKilled: state.stats.bossKills, totalShotsFired: state.stats.shotsFired, maxStageReached: state.stage }); }
             }
          }
        }
      });
      
      // Player Bullet vs Mine check
      if (b.owner === 'player' && !b.dead) {
          state.bullets.filter(mine => mine.isMine && !mine.dead).forEach(mine => {
              const d = Math.sqrt(Math.pow(b.x - mine.x, 2) + Math.pow(b.y - mine.y, 2));
              if (d < mine.width + b.width) {
                  b.dead = true;
                  if (mine.hp) mine.hp -= b.damage;
                  createExplosion(mine.x, mine.y, 20, 0);
              }
          });
      }

    });

    if (state.player.invulnerableTime > 0) {
       state.player.invulnerableTime--;
    } else {
       const checkHit = (entityX: number, entityY: number, size: number) => {
          const dist = Math.sqrt(Math.pow(entityX - state.player.x, 2) + Math.pow(entityY - state.player.y, 2));
          if (dist < size + 4) {
             if (state.player.shield && state.player.shield > 0) {
                state.player.shield -= 20 * incomingDamageMultiplier; 
                if (state.player.spellLevels[SpellCardId.AEGIS_SHIELD] >= 3) { createExplosion(state.player.x, state.player.y, 150, 100); }
                state.player.invulnerableTime = 30;
             } else {
               state.player.hp -= 20 * incomingDamageMultiplier; state.player.framesSinceLastHit = 0; audioService.playExplosion(); 
               if (state.player.hp <= 0) {
                  if (state.player.revives > 0) { state.player.revives--; state.player.hp = state.player.maxHp; state.player.invulnerableTime = 120; createExplosion(state.player.x, state.player.y, 200, 500); }
                  else { state.isGameOver = true; onGameOver(state.score, false, state.dataFragments, { totalKills: state.stats.kills, bossesKilled: state.stats.bossKills, totalShotsFired: state.stats.shotsFired, maxStageReached: state.stage }); }
               } else { state.player.invulnerableTime = 60; }
             }
             return true;
          } else if (dist < 20) { state.player.grazing++; state.score += 10; }
          return false;
       }

       state.bullets.filter(b => b.owner === 'enemy').forEach(b => {
          if (state.player.equippedWeapons.includes(WeaponId.ORBITING_ORBS)) {
             const orbs = state.bullets.filter(pb => pb.owner === 'player' && pb.weaponId === WeaponId.ORBITING_ORBS);
             for (const orb of orbs) {
                if (orb.orbCooldown && orb.orbCooldown > 0) continue; 
                const d = Math.sqrt(Math.pow(orb.x - b.x, 2) + Math.pow(orb.y - b.y, 2));
                if (d < orb.width + b.width) { if (state.player.weaponLevels[WeaponId.ORBITING_ORBS] >= 3) { b.dead = true; orb.orbCooldown = 240; return; } }
             }
          }
          // Laser Detection (Rectangular)
          if (b.isLaser) {
              if (b.y > CANVAS_HEIGHT) return;
              if (state.player.y > b.y && state.player.y < b.y + b.height && state.player.x > b.x && state.player.x < b.x + b.width) {
                  checkHit(state.player.x, state.player.y, 0); // Force hit
              }
              return;
          }

          if (checkHit(b.x, b.y, b.width)) b.dead = true;
       });

       state.enemies.forEach(e => { 
           // Ghost drones have no collision
           if (!e.isGhost) {
               checkHit(e.x, e.y, e.width + 5);
           }
       });
    }

    state.bullets = state.bullets.filter(b => !b.dead);
    state.enemies = state.enemies.filter(e => !e.dead);
    state.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; p.alpha = p.life / p.maxLife; if (p.life <= 0) p.dead = true; });
    state.particles = state.particles.filter(p => !p.dead);

    setHudState(prev => ({
       ...prev, hp: state.player.hp, score: state.score, stage: state.stage, spellsReady: state.player.spellCooldowns.map(cd => cd <= 0), shield: state.player.shield || 0, revives: state.player.revives, bossHp: state.boss ? state.boss.hp : 0, bossMaxHp: state.boss ? state.boss.maxHp : 1, practiceTime: state.practiceTimer
    }));
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const state = gameState.current;
    
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const gridOffset = (state.frame * 2) % 40;
    for (let i = 0; i < CANVAS_WIDTH; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for (let i = 0; i < CANVAS_HEIGHT; i+=40) { ctx.beginPath(); ctx.moveTo(0, i + gridOffset); ctx.lineTo(CANVAS_WIDTH, i + gridOffset); ctx.stroke(); }

    // Somniomancer Gravity Visual
    if (state.bossActive && state.boss?.variant === 'somniomancer' && state.boss.gravityDir && (state.boss.gravityTimer || 0) > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3 * (Math.sin(state.frame * 0.2) + 1);
        ctx.fillStyle = '#9d00ff';
        const gx = state.boss.gravityDir.x * 200;
        const gy = state.boss.gravityDir.y * 200;
        // Draw ripple lines
        ctx.beginPath();
        for(let k=0; k<CANVAS_WIDTH; k+=50) {
            for(let j=0; j<CANVAS_HEIGHT; j+=50) {
                ctx.moveTo(k, j);
                ctx.lineTo(k + gx * 0.1, j + gy * 0.1);
            }
        }
        ctx.strokeStyle = '#9d00ff';
        ctx.stroke();
        ctx.restore();
    }

    state.bullets.filter(b => b.isVortex).forEach(b => {
        ctx.save();
        const pullRadius = b.minSpeedReached ? 225 : 150;
        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pullRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(b.x, b.y, pullRadius, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 5; ctx.shadowColor = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.width, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });

    state.particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.width, p.height); });
    ctx.globalAlpha = 1;

    state.enemies.forEach(e => {
       ctx.save();
       ctx.translate(e.x, e.y);
       ctx.shadowBlur = 10;
       ctx.shadowColor = e.color;
       ctx.fillStyle = e.color;
       
       if (e.frozenTimer && e.frozenTimer > 0) { ctx.shadowColor = '#00ffff'; ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.strokeRect(-e.width/2 - 2, -e.height/2 - 2, e.width + 4, e.height + 4); }
       if (e.type === 'stealth') { ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.1) * 0.4; }
       if (e.state === 'entering') { ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.5) * 0.5; }
       
       // Ghost Effect
       if (e.isGhost) {
           ctx.globalAlpha = 0.4; // Semi-transparent
           // Draw target line if charging (Gorgon)
           if (e.ghostState === 'charging' && e.ghostType === 'gorgon') {
               ctx.save();
               ctx.globalAlpha = 0.6;
               ctx.strokeStyle = '#ff0000';
               ctx.setLineDash([5, 5]);
               ctx.lineWidth = 1;
               const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
               ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(angle)*1000, Math.sin(angle)*1000); ctx.stroke();
               ctx.restore();
           }
       }

       if (e.type === 'boss' || e.type === 'boss_clone') {
          const isPhase2 = e.phase === 2;
          if (isPhase2) { ctx.shadowColor = '#ff3333'; ctx.shadowBlur = 20 + Math.sin(state.frame * 0.2) * 10; }
          
          if (e.dmgReduction && e.dmgReduction > 0) {
              ctx.save(); ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(state.frame * 0.2) * 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(0, 0, Math.max(e.width + 10, 50), 0, Math.PI * 2); ctx.stroke();
              ctx.beginPath(); for(let k=0; k<6; k++) { const a = (Math.PI * 2 / 6) * k + state.frame * 0.01; const r = Math.max(e.width + 10, 50); if (k===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath(); ctx.strokeStyle = `rgba(0, 255, 255, 0.2)`; ctx.stroke(); ctx.restore();
          }

          if (e.variant === 'theta' && e.shieldActive) { ctx.save(); ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.1) * 0.2; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
          
          // Alptraum Shield Visual (Same as Theta)
          if (e.variant === 'alptraum' && e.shieldActive) { ctx.save(); ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff'; ctx.globalAlpha = 0.5 + Math.sin(state.frame * 0.1) * 0.2; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }

          if (e.dashState === 'warning') { ctx.save(); ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, CANVAS_HEIGHT); ctx.stroke(); ctx.restore(); }

          if (e.variant === 'beta') { ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(-20, -20); ctx.lineTo(20, -20); ctx.fill(); }
          else if (e.variant === 'gamma') { ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height); }
          else if (e.variant === 'delta') { ctx.fillRect(-5, -30, 10, 60); ctx.fillRect(-30, -5, 60, 10); }
          else if (e.variant === 'theta') { ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 40, state.frame*0.1, state.frame*0.1 + Math.PI); ctx.stroke(); }
          else if (e.variant === 'somniomancer') {
             // Somniomancer Visuals
             ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.fill();
             ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
             ctx.strokeStyle = '#d8b4fe'; ctx.beginPath(); ctx.moveTo(-40,0); ctx.lineTo(40,0); ctx.stroke();
             // Removed text label for clone
          } else if (e.variant === 'revenant') {
             // Revenant Visuals
             ctx.beginPath(); ctx.moveTo(0,-30); ctx.lineTo(20,0); ctx.lineTo(10,30); ctx.lineTo(-10,30); ctx.lineTo(-20,0); ctx.fill();
          } else if (e.variant === 'alptraum') {
             // Alptraum Visuals
             ctx.beginPath(); for(let k=0; k<8; k++) { const angle = k * (Math.PI*2/8); const r = k%2===0 ? 40 : 20; ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r); } ctx.fill();
             // Eye
             ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
             if (e.trinityActive || e.duoActive) {
                 // Connection lines to minis
                 ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
                 state.enemies.filter(en => en.type === 'alp_mini_boss').forEach(m => {
                     ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(m.x - e.x, m.y - e.y); ctx.stroke();
                 });
             }
          } else { ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(e.width * Math.cos(i * Math.PI / 3), e.width * Math.sin(i * Math.PI / 3)); ctx.closePath(); ctx.fill(); }
          
          ctx.globalAlpha = 1; 
          // Render HP Bar Under Boss
          if (e.shieldActive && e.shieldMax) { ctx.fillStyle = '#00ffff'; ctx.fillRect(-30, -58, 60 * ((e.shieldHp||0) / e.shieldMax), 3); }

       } else if (e.type === 'seraph_drone') { ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.fill(); }
       else if (e.type === 'oracle_minion') { ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill(); }
       else if (e.type === 'gorgon' || (e.isGhost && e.ghostType === 'gorgon')) { ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(0, 10); ctx.fill(); if ((e.laserCharge || 0) > 0) { ctx.strokeStyle = '#0055ff'; ctx.lineWidth = 1; ctx.setLineDash([2,2]); const fireAngle = e.targetAngle || Math.atan2(state.player.y - e.y, state.player.x - e.x); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(fireAngle)*1000, Math.sin(fireAngle)*1000); ctx.stroke(); ctx.setLineDash([]); } }
       else if (e.type === 'kamikaze') { ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill(); if (state.frame % 10 < 5) { ctx.fillStyle = '#ff0000'; ctx.fillRect(-2,-2,4,4); } }
       else if (e.type === 'aegis_bot') { ctx.fillRect(-10,-10,20,20); if (e.shieldActive) { ctx.strokeStyle = '#00ffff'; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.stroke(); } }
       else if (e.type === 'swarmer') { ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.fill(); }
       else if (e.type === 'lich') { ctx.fillRect(-8,-15,16,30); }
       else if (e.type === 'sniper') { ctx.fillRect(-2,-10,4,20); ctx.fillRect(-8,-2,16,4); if ((e.laserCharge || 0) > 0) { ctx.strokeStyle = 'rgba(255,0,0,0.8)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(state.player.x - e.x, state.player.y - e.y); ctx.stroke(); } if (e.dmgReduction && e.dmgReduction > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.stroke(); } }
       else if (e.type === 'reflector' || e.type === 'alp_reflector') { ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(12,0); ctx.lineTo(0,12); ctx.lineTo(-12,0); ctx.fill(); if (e.isReflecting) { ctx.strokeStyle = '#fff'; ctx.lineWidth=2; ctx.save(); ctx.rotate(state.frame * 0.2); ctx.beginPath(); ctx.moveTo(-20,-20); ctx.lineTo(20,-20); ctx.lineTo(20,20); ctx.lineTo(-20,20); ctx.closePath(); ctx.stroke(); ctx.restore(); } }
       else if (e.type === 'breacher') { ctx.beginPath(); for (let k=0; k<5; k++) { ctx.lineTo(Math.cos(k*Math.PI*2/5)*12, Math.sin(k*Math.PI*2/5)*12); } ctx.fill(); }
       else if (e.type === 'illusion_clone') { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill(); }
       else if (e.type === 'alp_mini_boss') {
           // Mini Boss visual based on variant
           if (e.variant === 'alpha') { ctx.beginPath(); for(let i=0;i<6;i++) ctx.lineTo(12*Math.cos(i*Math.PI/3), 12*Math.sin(i*Math.PI/3)); ctx.fill(); }
           else if (e.variant === 'beta') { ctx.beginPath(); ctx.moveTo(0,15); ctx.lineTo(-10,-10); ctx.lineTo(10,-10); ctx.fill(); }
           else if (e.variant === 'gamma') { ctx.fillRect(-12,-12,24,24); }
           else if (e.variant === 'delta') { ctx.beginPath(); ctx.moveTo(0,-15); ctx.lineTo(10,0); ctx.lineTo(0,15); ctx.lineTo(-10,0); ctx.fill(); } // Diamond
           else if (e.variant === 'theta') { ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); } // Circle
           else { ctx.fillRect(-10,-10,20,20); }
       }
       else { 
           // Generic fallback (Drone, Tank, Seeker)
           if (e.type === 'seeker') { ctx.beginPath(); ctx.arc(0, 0, e.width, 0, Math.PI * 2); ctx.fill(); } 
           else { 
               // Tank / Ghost Tank
               ctx.beginPath(); ctx.moveTo(0, e.height); ctx.lineTo(-e.width/2, -e.height); ctx.lineTo(e.width/2, -e.height); ctx.fill(); 
           } 
       }
       ctx.restore();

       if (e.type !== 'boss' && e.type !== 'boss_clone' && !e.isGhost) { ctx.save(); const hpPct = Math.max(0, e.hp / e.maxHp); ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; ctx.fillRect(e.x - e.width, e.y - e.height - 6, e.width * 2, 3); ctx.fillStyle = '#00ff00'; ctx.fillRect(e.x - e.width, e.y - e.height - 6, (e.width * 2) * hpPct, 3); ctx.restore(); }
    });

    state.bullets.filter(b => !b.isVortex).forEach(b => {
       ctx.save();
       ctx.shadowBlur = 5;
       ctx.shadowColor = b.color;
       ctx.fillStyle = b.color;
       
       // Apply Alpha for Player Bullets
       if (b.owner === 'player') {
           ctx.globalAlpha = playerBulletAlpha;
       }

       if (b.isSpawner) {
           // Spawner visual
           ctx.strokeStyle = b.color;
           ctx.lineWidth = 2;
           ctx.beginPath(); ctx.moveTo(b.x-5, b.y-5); ctx.lineTo(b.x+5, b.y+5); ctx.moveTo(b.x+5, b.y-5); ctx.lineTo(b.x-5, b.y+5); ctx.stroke();
       } else if (b.weaponId === WeaponId.LASER_STREAM || b.weaponId === WeaponId.GAUSS_CANNON || b.isLaser) {
         ctx.fillRect(b.x - b.width/2, b.y, b.width, b.height);
       } else if (b.weaponId === WeaponId.PHASE_BLADES) {
         ctx.translate(b.x, b.y); ctx.rotate(state.frame * 0.5); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.fill();
       } else {
         ctx.beginPath(); ctx.arc(b.x, b.y, b.width, 0, Math.PI * 2); ctx.fill();
         if (b.isMine) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); } // Mine Center
       }
       ctx.restore();
    });

    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnerableTime > 0 && Math.floor(state.frame / 4) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-10, 10); ctx.lineTo(0, 5); ctx.lineTo(10, 10); ctx.fill();
    if (p.shield && p.shield > 0) { ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke(); }
    if (p.focused) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); }
    if (p.framesSinceLastHit > 600) { ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(state.frame * 0.1) * 2, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();

    if (isPaused) {
       ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT); ctx.fillStyle = '#fff'; ctx.font = '40px Rajdhani'; ctx.textAlign = 'center'; ctx.fillText("PAUSED", CANVAS_WIDTH/2, CANVAS_HEIGHT/2); ctx.font = '20px Mono'; ctx.fillText("PRESS ESC TO RESUME", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 40);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = 0;
    let accumulator = 0;
    const STEP = 1000 / 90; 

    const loop = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const deltaTime = time - lastTime;
      lastTime = time;

      if (!gameStarted) {
          setGameStarted(true);
          audioService.playBattleStart();
      }

      if (!isPaused) {
          accumulator += Math.min(deltaTime, 100); 
          while (accumulator >= STEP) {
              update();
              accumulator -= STEP;
          }
      }
      
      draw(ctx);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    const handleKeyDown = (e: KeyboardEvent) => { 
        if (e.key === 'Escape') {
            setIsPaused(prev => !prev);
        }
        gameState.current.keys[e.code] = true; 
    };
    const handleKeyUp = (e: KeyboardEvent) => { gameState.current.keys[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, gameStarted]);

  const bossHpPercent = hudState.bossHp > 0 ? (hudState.bossHp / hudState.bossMaxHp) * 100 : 0;

  return (
    <div className="relative flex justify-center items-center h-full w-full bg-black overflow-hidden">
      <div style={{ transform: `scale(${scale})` }} className="relative origin-center shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-center z-10">
          <div className="w-[600px] h-[800px] relative">
            
            {/* Boss HP Bar (Left Side) */}
            {hudState.bossHp > 0 && (
                <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 h-[60%] w-6 bg-gray-900 border border-red-900 overflow-hidden flex flex-col justify-end">
                    <div 
                        className="w-full bg-red-600 transition-all duration-200"
                        style={{ height: `${bossHpPercent}%` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center -rotate-90">
                        <span className="text-white font-mono font-bold text-xs tracking-wider whitespace-nowrap drop-shadow-md">
                            TARGET INTEGRITY: {bossHpPercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}

            {/* Practice Mode HUD Overlay */}
            {practiceMode && (
                <div className="absolute top-16 right-4 text-right">
                    <div className="text-yellow-400 font-bold font-mono text-xl animate-pulse">SIMULATION MODE</div>
                    <div className="text-gray-400 text-sm font-mono">
                        TARGET: {practiceMode.entry.name}
                    </div>
                    {practiceMode.entry.type === 'mob' && (
                        <div className="text-white text-lg font-mono mt-1 border border-yellow-600 bg-black/50 px-2 inline-block">
                            TIME: {hudState.practiceTime} / 60s
                        </div>
                    )}
                </div>
            )}

            <div className="absolute top-4 left-4 text-cyan-400 font-mono text-xl drop-shadow-md bg-black/40 px-2 rounded">
               SCORE: {hudState.score.toString().padStart(8, '0')}
            </div>
            <div className="absolute top-4 right-4 text-red-500 font-mono text-xl drop-shadow-md bg-black/40 px-2 rounded flex flex-col items-end">
               <span>HP: {Math.max(0, Math.floor(hudState.hp))}%</span>
               {hudState.shield > 0 && <span className="text-blue-400 text-sm">SHIELD: {hudState.shield}</span>}
               {hudState.revives > 0 && <span className="text-green-400 text-sm">REVIVES: {hudState.revives}</span>}
               {pityStacks > 0 && (
                  <span className="text-purple-400 text-xs mt-1 animate-pulse">
                     TAC. SUPPORT: {pityStacks}
                  </span>
               )}
            </div>
            
            <div className="absolute bottom-4 left-4 font-mono text-lg drop-shadow-md bg-black/40 px-2 rounded flex flex-col items-start gap-1">
               {loadout.spells.map((spell, idx) => (
                  <div key={idx} className={`${hudState.spellsReady[idx] ? 'text-yellow-400' : 'text-gray-600'}`}>
                     [{idx === 0 ? 'X' : idx === 1 ? 'C' : 'V'}] {SPELL_CARDS[spell].name}: {hudState.spellsReady[idx] ? 'READY' : 'WAIT'}
                  </div>
               ))}
               {loadout.spells.length === 0 && <div className="text-gray-600">NO SPELLS EQUIPPED</div>}
            </div>

            {hudState.bossName && (
               <div className="absolute top-16 left-0 w-full text-center transition-opacity duration-1000">
                  <h2 className="text-3xl font-bold text-red-600 tracking-widest bg-black/50 inline-block px-4 border border-red-600 transform -skew-x-12 animate-pulse">
                     WARNING: {hudState.bossName}
                  </h2>
               </div>
            )}
            {hudState.dialogue && (
               <div className="absolute bottom-32 left-10 right-10 bg-black/80 border border-cyan-500 p-4 text-cyan-300 font-mono text-lg animate-pulse">
                  <span className="text-xs text-gray-500 block mb-1">INCOMING TRANSMISSION...</span>
                  &gt; {hudState.dialogue}
               </div>
            )}
            <div className="absolute inset-0 crt-overlay"></div>
          </div>
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border-2 border-slate-800 shadow-[0_0_30px_rgba(0,240,255,0.1)] bg-black block" />
        
        {/* PAUSE / SETTINGS OVERLAY */}
        {isPaused && (
           <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-auto">
              <SettingsMenu 
                onClose={() => setIsPaused(false)} 
                playerBulletAlpha={playerBulletAlpha}
                setPlayerBulletAlpha={setPlayerBulletAlpha}
              />
           </div>
        )}
      </div>
      <button onClick={onExit} className="absolute top-4 left-4 z-50 bg-red-900/50 text-white px-3 py-1 border border-red-500 hover:bg-red-800 cursor-pointer text-xs sm:text-base">
         ABORT
      </button>
    </div>
  );
};

export default GameCanvas;
