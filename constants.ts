
import { WeaponId, SpellCardId, WeaponDef, SpellCardDef, BoosterId, BoosterDef, DatabaseEntry } from './types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

export const BOOSTERS: Record<BoosterId, BoosterDef> = {
  [BoosterId.EXTRA_LIFE]: { id: BoosterId.EXTRA_LIFE, name: "EMERGENCY REBOOT", description: "Revive once with full HP upon death.", cost: 2000 },
  [BoosterId.ATTACK_UP]: { id: BoosterId.ATTACK_UP, name: "WEAPON OVERCHARGE", description: "+25% Damage to all weapons.", cost: 1000 },
  [BoosterId.REGEN_UP]: { id: BoosterId.REGEN_UP, name: "NANITE INJECTION", description: "+100% Passive Health Regen Speed.", cost: 800 },
  [BoosterId.CDR_UP]: { id: BoosterId.CDR_UP, name: "QUICK PROCESSOR", description: "20% Cooldown Reduction for Spells/Weapons.", cost: 1200 },
  [BoosterId.LOOT_UP]: { id: BoosterId.LOOT_UP, name: "DATA MINER", description: "+100% Data Fragments dropped.", cost: 1500 },
  [BoosterId.EXTRA_WEAPON]: { id: BoosterId.EXTRA_WEAPON, name: "AUXILIARY MOUNT", description: "Equip +1 extra Weapon.", cost: 4500 },
  [BoosterId.EXTRA_SPELL]: { id: BoosterId.EXTRA_SPELL, name: "MEMORY EXPANSION", description: "Equip +1 extra Spell (Key: V).", cost: 3750 },
  [BoosterId.DMG_RED]: { id: BoosterId.DMG_RED, name: "COMPOSITE ARMOR", description: "Reduces all incoming damage by 34%.", cost: 1500 },
};

export const DATABASE_ENTRIES: DatabaseEntry[] = [
    // MOBS
    { id: 'drone', name: 'DRONE', type: 'mob', description: 'Basic aerial unit. Erratic movement.', cost: 100, gameId: 'drone' },
    { id: 'seeker', name: 'SEEKER', type: 'mob', description: 'Small suicide unit. Tracks player position.', cost: 150, gameId: 'seeker' },
    { id: 'swarmer', name: 'SWARMER', type: 'mob', description: 'Weak unit that attacks in groups.', cost: 200, gameId: 'swarmer' },
    { id: 'kamikaze', name: 'KAMIKAZE', type: 'mob', description: 'Explosive unit. Deadly on contact.', cost: 300, gameId: 'kamikaze' },
    { id: 'interceptor', name: 'INTERCEPTOR', type: 'mob', description: 'Fast attack fighter.', cost: 400, gameId: 'interceptor' },
    { id: 'tank', name: 'HEAVY TANK', type: 'mob', description: 'Durable unit with heavy weaponry.', cost: 500, gameId: 'tank' },
    { id: 'stealth', name: 'STEALTH JET', type: 'mob', description: 'Cloaked unit. Hard to see.', cost: 600, gameId: 'stealth' },
    { id: 'aegis_bot', name: 'AEGIS BOT', type: 'mob', description: 'Shielded unit. Immune periodically.', cost: 800, gameId: 'aegis_bot' },
    { id: 'gorgon', name: 'GORGON', type: 'mob', description: 'Laser platform. High damage.', cost: 1000, gameId: 'gorgon' },
    { id: 'breacher', name: 'BREACHER', type: 'mob', description: 'Fires decelerating projectiles.', cost: 1200, gameId: 'breacher' },
    { id: 'sniper', name: 'SNIPER', type: 'mob', description: 'Long range precision unit. Leaves bullet trails.', cost: 1500, gameId: 'sniper' },
    { id: 'reflector', name: 'REFLECTOR', type: 'mob', description: 'Reflects player attacks periodically.', cost: 1800, gameId: 'reflector' },
    { id: 'lich', name: 'LICH', type: 'mob', description: 'Summoner unit. Deploys smaller drones.', cost: 2000, gameId: 'lich' },

    // BOSSES
    { id: 'boss_alpha', name: 'UNIT-01: CONSTRUCT', type: 'boss', description: 'Basic heavy assault mech.', cost: 2500, gameId: 'boss', bossVariant: 'alpha' },
    { id: 'boss_beta', name: 'UNIT-02: VIPER', type: 'boss', description: 'High mobility snake-like unit.', cost: 3000, gameId: 'boss', bossVariant: 'beta' },
    { id: 'boss_gamma', name: 'UNIT-03: TITAN', type: 'boss', description: 'Massive fortress unit.', cost: 3500, gameId: 'boss', bossVariant: 'gamma' },
    { id: 'boss_delta', name: 'UNIT-04: SERAPH', type: 'boss', description: 'Orbital defense system with drones.', cost: 4000, gameId: 'boss', bossVariant: 'delta' },
    { id: 'boss_theta', name: 'UNIT-05: ORACLE', type: 'boss', description: 'Advanced AI with shielding.', cost: 5000, gameId: 'boss', bossVariant: 'theta' },
    { id: 'boss_somniomancer', name: 'SOMNIOMANCER', type: 'boss', description: 'Master of illusions and sleep.', cost: 6000, gameId: 'boss', bossVariant: 'somniomancer' },
    { id: 'boss_revenant', name: 'REVENANT', type: 'boss', description: 'Undead glitched entity. Self-repairs.', cost: 7000, gameId: 'boss', bossVariant: 'revenant' },
    { id: 'boss_alptraum', name: 'ALPTRAUM', type: 'boss', description: 'The Nightmare. Controls the arena.', cost: 8000, gameId: 'boss', bossVariant: 'alptraum' },
];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  [WeaponId.PLASMA_CUTTER]: {
    id: WeaponId.PLASMA_CUTTER,
    name: "PLASMA CUTTER",
    description: "Standard issue rapid-fire energy bolts.",
    color: "#00f0ff",
    unlockCost: 0,
    stats: [
      { label: "DMG", value: 4, text: "10-13", color: "#ff5555" },
      { label: "ROF", value: 8, text: "HIGH", color: "#55ff55" },
      { label: "RNG", value: 8, text: "LONG", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 200, description: "Damage Output +30%" },
      lv3: { cost: 500, description: "EVOLUTION: TRI-STAR (Fires 3 parallel streams)" }
    }
  },
  [WeaponId.HOMING_NEEDLES]: {
    id: WeaponId.HOMING_NEEDLES,
    name: "SMART NEEDLES",
    description: "Low damage, auto-targeting micro-missiles.",
    color: "#ff00aa",
    unlockCost: 50,
    stats: [
      { label: "DMG", value: 2, text: "4", color: "#ff5555" },
      { label: "ROF", value: 8, text: "HIGH", color: "#55ff55" },
      { label: "AIM", value: 10, text: "AUTO", color: "#ff55ff" }
    ],
    upgrades: {
      lv2: { cost: 250, description: "Flight Speed +50%" },
      lv3: { cost: 600, description: "EVOLUTION: SWARM (Doubles projectile count)" }
    }
  },
  [WeaponId.SPREAD_SHOTGUN]: {
    id: WeaponId.SPREAD_SHOTGUN,
    name: "RIOT SHOTGUN",
    description: "Short range, high spread, devastating up close.",
    color: "#ff5500",
    unlockCost: 100,
    stats: [
      { label: "DMG", value: 6, text: "5x5", color: "#ff5555" },
      { label: "ROF", value: 5, text: "MED", color: "#55ff55" },
      { label: "RNG", value: 3, text: "SHORT", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 300, description: "Fire Rate +25%" },
      lv3: { cost: 700, description: "EVOLUTION: FLAK CANNON (7 bullets + Penetration)" }
    }
  },
  [WeaponId.LASER_STREAM]: {
    id: WeaponId.LASER_STREAM,
    name: "VOID BEAM",
    description: "Continuous piercing laser.",
    color: "#aa00ff",
    unlockCost: 200,
    stats: [
      { label: "DMG", value: 7, text: "22.5-34", color: "#ff5555" },
      { label: "ROF", value: 10, text: "CONT.", color: "#55ff55" },
      { label: "PEN", value: 10, text: "INF", color: "#ffff55" }
    ],
    upgrades: {
      lv2: { cost: 400, description: "Beam Width +100%" },
      lv3: { cost: 800, description: "EVOLUTION: HYPERION (Massive damage + Screen shake)" }
    }
  },
  [WeaponId.WAVE_MOTION]: {
    id: WeaponId.WAVE_MOTION,
    name: "SINE WAVE",
    description: "Oscillating projectiles that cover a wide area.",
    color: "#00ffaa",
    unlockCost: 150,
    stats: [
      { label: "DMG", value: 5, text: "13.5", color: "#ff5555" },
      { label: "ROF", value: 6, text: "MED", color: "#55ff55" },
      { label: "AREA", value: 7, text: "WIDE", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 350, description: "Oscillation Frequency Up" },
      lv3: { cost: 750, description: "EVOLUTION: DOUBLE HELIX (Intertwining DNA pattern)" }
    }
  },
  [WeaponId.ORBITING_ORBS]: {
    id: WeaponId.ORBITING_ORBS,
    name: "AEGIS ORBS",
    description: "Defensive satellites. Max 2/3/4 orbs. Blocks projectiles (4s cooldown).",
    color: "#ffff00",
    unlockCost: 300,
    stats: [
      { label: "DMG", value: 4, text: "15-20", color: "#ff5555" },
      { label: "DEF", value: 9, text: "BLOCK", color: "#5555ff" },
      { label: "RNG", value: 2, text: "MELEE", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 500, description: "Max 3 Orbs & Dmg +50%" },
      lv3: { cost: 1000, description: "Max 4 Orbs & Projectile Deletion" }
    }
  },
  [WeaponId.ROCKET_BARRAGE]: {
    id: WeaponId.ROCKET_BARRAGE,
    name: "HYDRA ROCKETS",
    description: "Slow moving explosives with splash damage.",
    color: "#ff0000",
    unlockCost: 400,
    stats: [
      { label: "DMG", value: 6, text: "10+AOE", color: "#ff5555" },
      { label: "ROF", value: 4, text: "LOW", color: "#55ff55" },
      { label: "BLAST", value: 8, text: "LARGE", color: "#ffaa00" }
    ],
    upgrades: {
      lv2: { cost: 600, description: "Explosion Radius +40%" },
      lv3: { cost: 1200, description: "EVOLUTION: CLUSTER BOMB (Spawns mini-explosions on hit)" }
    }
  },
  [WeaponId.CHAIN_LIGHTNING]: {
    id: WeaponId.CHAIN_LIGHTNING,
    name: "ARC CASTER",
    description: "High damage electricity that jumps targets.",
    color: "#00aaff",
    unlockCost: 500,
    stats: [
      { label: "DMG", value: 7, text: "27-39", color: "#ff5555" },
      { label: "ROF", value: 5, text: "MED", color: "#55ff55" },
      { label: "CHAIN", value: 8, text: "4-8", color: "#ffff55" }
    ],
    upgrades: {
      lv2: { cost: 700, description: "Jump Range +100% & Dmg +50%" },
      lv3: { cost: 1400, description: "EVOLUTION: THUNDERSTORM (Chains 8 times + Stuns)" }
    }
  },
  [WeaponId.BACK_TURRET]: {
    id: WeaponId.BACK_TURRET,
    name: "REAR GUARD",
    description: "High caliber rear cannon.",
    color: "#aaaaaa",
    unlockCost: 250,
    stats: [
      { label: "DMG", value: 6, text: "19-26", color: "#ff5555" },
      { label: "ROF", value: 6, text: "MED", color: "#55ff55" },
      { label: "DIR", value: 10, text: "REAR", color: "#aa55ff" }
    ],
    upgrades: {
      lv2: { cost: 400, description: "Damage +60%" },
      lv3: { cost: 900, description: "EVOLUTION: OMNI-DIRECTIONAL (Fires Front and Back)" }
    }
  },
  [WeaponId.VORTEX_DRIVER]: {
    id: WeaponId.VORTEX_DRIVER,
    name: "GRAVITY WELL",
    description: "Projectiles that slow down and pull enemies together.",
    color: "#ffffff",
    unlockCost: 1000,
    stats: [
      { label: "DMG", value: 2, text: "DOT", color: "#ff5555" },
      { label: "CC", value: 10, text: "PULL", color: "#aa00ff" },
      { label: "AREA", value: 8, text: "WIDE", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 1500, description: "Pull Strength +50%" },
      lv3: { cost: 3000, description: "EVOLUTION: BLACK HOLE (Larger area + DOT)" }
    }
  },
  [WeaponId.GAUSS_CANNON]: {
    id: WeaponId.GAUSS_CANNON,
    name: "GAUSS RAIL",
    description: "Low fire rate, extreme velocity, massive single-target damage.",
    color: "#00ff00",
    unlockCost: 1200,
    stats: [
      { label: "DMG", value: 10, text: "800", color: "#ff5555" },
      { label: "ROF", value: 2, text: "SLOW", color: "#55ff55" },
      { label: "PEN", value: 5, text: "1-3", color: "#ffff55" }
    ],
    upgrades: {
      lv2: { cost: 1800, description: "Penetrates 3 targets" },
      lv3: { cost: 3500, description: "EVOLUTION: RAILGUN (Instantly hits target, leaves trail)" }
    }
  },
  [WeaponId.PULSE_NOVA]: {
    id: WeaponId.PULSE_NOVA,
    name: "PULSE NOVA",
    description: "Slow moving energy ball that pulses damage area.",
    color: "#ff00ff",
    unlockCost: 1500,
    stats: [
      { label: "DMG", value: 8, text: "100", color: "#ff5555" },
      { label: "ROF", value: 4, text: "SLOW", color: "#55ff55" },
      { label: "AREA", value: 9, text: "PULSE", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 2000, description: "Pulse Rate +50%" },
      lv3: { cost: 4000, description: "EVOLUTION: SUPERNOVA (Massive Size + Explodes on death)" }
    }
  },
  [WeaponId.PHASE_BLADES]: {
    id: WeaponId.PHASE_BLADES,
    name: "PHASE BLADES",
    description: "Summons autonomous blades that slash enemies.",
    color: "#ff8800",
    unlockCost: 2000,
    stats: [
      { label: "DMG", value: 5, text: "18x2", color: "#ff5555" },
      { label: "ROF", value: 6, text: "MED", color: "#55ff55" },
      { label: "AIM", value: 9, text: "SMART", color: "#ff55ff" }
    ],
    upgrades: {
      lv2: { cost: 2500, description: "Summon +1 Blade" },
      lv3: { cost: 5000, description: "EVOLUTION: BLADE DANCE (Blades teleport to targets)" }
    }
  }
};

export const SPELL_CARDS: Record<SpellCardId, SpellCardDef> = {
  [SpellCardId.TIME_DILATOR]: {
    id: SpellCardId.TIME_DILATOR,
    name: "CHRONO STASIS",
    description: "Slows all enemy projectiles by 80% for 5 seconds.",
    cooldown: 45,
    color: "#00f0ff",
    unlockCost: 200,
    stats: [
      { label: "CD", value: 5, text: "45s", color: "#5555ff" },
      { label: "DUR", value: 5, text: "5s", color: "#55ff55" },
      { label: "SLOW", value: 8, text: "80%", color: "#00ffff" }
    ],
    upgrades: {
      lv2: { cost: 500, description: "Duration +2s" },
      lv3: { cost: 1000, description: "Duration +3s" }
    }
  },
  [SpellCardId.EMP_BLAST]: {
    id: SpellCardId.EMP_BLAST,
    name: "EMP BURST",
    description: "Instantly destroys all enemy bullets on screen.",
    cooldown: 30,
    color: "#ffff00",
    unlockCost: 300,
    stats: [
      { label: "CD", value: 8, text: "30s", color: "#5555ff" },
      { label: "DMG", value: 2, text: "0-200", color: "#ff5555" },
      { label: "AREA", value: 10, text: "SCREEN", color: "#55ffff" }
    ],
    upgrades: {
      lv2: { cost: 600, description: "Cooldown -5s" },
      lv3: { cost: 1200, description: "Deals 200 damage to all enemies on screen" }
    }
  },
  [SpellCardId.OVERCLOCK]: {
    id: SpellCardId.OVERCLOCK,
    name: "SYS OVERCLOCK",
    description: "Doubles fire rate and movement speed for 5 seconds.",
    cooldown: 40,
    color: "#ff0055",
    unlockCost: 400,
    stats: [
      { label: "CD", value: 6, text: "40s", color: "#5555ff" },
      { label: "DUR", value: 5, text: "5s", color: "#55ff55" },
      { label: "BUFF", value: 10, text: "200%", color: "#ff55aa" }
    ],
    upgrades: {
      lv2: { cost: 800, description: "Duration +2s" },
      lv3: { cost: 1600, description: "Triples fire rate instead of double" }
    }
  },
  [SpellCardId.PHANTOM_DASH]: {
    id: SpellCardId.PHANTOM_DASH,
    name: "GHOST PROTOCOL",
    description: "Become invulnerable for 4 seconds.",
    cooldown: 35,
    color: "#ffffff",
    unlockCost: 250,
    stats: [
      { label: "CD", value: 7, text: "35s", color: "#5555ff" },
      { label: "DUR", value: 4, text: "4s", color: "#55ff55" },
      { label: "DEF", value: 10, text: "INVUL", color: "#ffffff" }
    ],
    upgrades: {
      lv2: { cost: 500, description: "Duration +1s" },
      lv3: { cost: 1000, description: "Cooldown -10s" }
    }
  },
  [SpellCardId.ORBITAL_STRIKE]: {
    id: SpellCardId.ORBITAL_STRIKE,
    name: "HAMMER OF DAWN",
    description: "Calls down a massive laser destroying everything in center.",
    cooldown: 60,
    color: "#ff5500",
    unlockCost: 1000,
    stats: [
      { label: "CD", value: 3, text: "60s", color: "#5555ff" },
      { label: "DMG", value: 10, text: "3000+", color: "#ff5555" },
      { label: "AREA", value: 4, text: "CENTER", color: "#ffaa00" }
    ],
    upgrades: {
      lv2: { cost: 2000, description: "Beam Radius +50%" },
      lv3: { cost: 4000, description: "Damage Doubled" }
    }
  },
  [SpellCardId.NANO_REPAIR]: {
    id: SpellCardId.NANO_REPAIR,
    name: "NANO REPAIR",
    description: "Regenerate 30% HP instantly.",
    cooldown: 90,
    color: "#00ff00",
    unlockCost: 800,
    stats: [
      { label: "CD", value: 1, text: "90s", color: "#5555ff" },
      { label: "HEAL", value: 4, text: "30%", color: "#00ff00" },
      { label: "TYPE", value: 10, text: "INST", color: "#ffffff" }
    ],
    upgrades: {
      lv2: { cost: 1500, description: "Heal 50% HP" },
      lv3: { cost: 3000, description: "Heal 50% + 5s Regen" }
    }
  },
  [SpellCardId.AEGIS_SHIELD]: {
    id: SpellCardId.AEGIS_SHIELD,
    name: "AEGIS BARRIER",
    description: "Gain a 50 HP temporary shield.",
    cooldown: 50,
    color: "#0088ff",
    unlockCost: 1200,
    stats: [
      { label: "CD", value: 5, text: "50s", color: "#5555ff" },
      { label: "HP", value: 5, text: "50", color: "#0088ff" },
      { label: "TYPE", value: 10, text: "TEMP", color: "#ffffff" }
    ],
    upgrades: {
      lv2: { cost: 2000, description: "Shield +30 HP" },
      lv3: { cost: 4000, description: "Shield +50 HP & Reflect Dmg" }
    }
  },
  [SpellCardId.STASIS_FIELD]: {
    id: SpellCardId.STASIS_FIELD,
    name: "ZERO POINT",
    description: "Freezes all enemies and projectiles for 3-5s.",
    cooldown: 60,
    color: "#8800ff",
    unlockCost: 1500,
    stats: [
      { label: "CD", value: 3, text: "60s", color: "#5555ff" },
      { label: "DUR", value: 3, text: "3s", color: "#55ff55" },
      { label: "CC", value: 10, text: "FREEZE", color: "#aa00ff" }
    ],
    upgrades: {
      lv2: { cost: 2500, description: "Duration +2s" },
      lv3: { cost: 5000, description: "Enemies take +50% dmg while frozen" }
    }
  }
};