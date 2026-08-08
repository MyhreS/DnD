import type { Combatant, EnemyStats, EnemyTemplate } from "@/types";

export function templateStats(template: EnemyTemplate): EnemyStats {
  return {
    name: template.name,
    initiative: template.initiative,
    ac: template.ac,
    maxHp: template.maxHp,
    note: template.note,
    revealHp: template.revealHp,
    revealStats: template.revealStats,
  };
}

export function combatantBaseStats(combatant: Combatant): EnemyStats {
  if (combatant.baseStats) return combatant.baseStats;
  return {
    name: combatant.name,
    initiative: combatant.initiative,
    ac: combatant.ac ?? null,
    maxHp: Math.max(1, combatant.maxHp ?? 1),
    note: combatant.note ?? null,
    revealHp: combatant.revealHp === true,
    revealStats: combatant.revealStats === true,
  };
}

export function resetEnemyPatch(combatant: Combatant): Partial<Combatant> {
  const stats = combatantBaseStats(combatant);
  return {
    ...stats,
    currentHp: stats.maxHp,
    defeated: false,
    conditions: [],
    conditionSince: {},
  };
}
