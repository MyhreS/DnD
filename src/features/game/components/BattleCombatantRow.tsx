import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, HunterCard } from "@/types";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { isBloodied } from "@/lib/character";
import { combatVitals } from "../lib/combatPresentation";
import { useOptimisticHunterHp } from "../hooks/useOptimisticHunterHp";
import { DYING_CONDITIONS, hunterDamageOutcome } from "../lib/hunterDamage";
import { BattleConditionsCell } from "./BattleConditionsCell";
import { BattleHealthCell } from "./BattleHealthCell";
import { BattleRowMenu } from "./BattleRowMenu";
import { BattleStepper } from "./BattleStepper";

/** One line of the initiative list: position, who, hit points, AC, initiative,
 * conditions and the DM's ••• menu, laid out on a fixed grid. */
export function BattleCombatantRow({
  combatant,
  position,
  round,
  active,
  characters,
  game,
  canManage,
  disabled,
  encounterCombatants,
}: {
  combatant: Combatant;
  position: number;
  round: number;
  active: boolean;
  characters: HunterCard[];
  game: Game;
  canManage: boolean;
  disabled: boolean;
  encounterCombatants: Combatant[];
}) {
  const patch = useCombatStore((state) => state.patch);
  const setHunterHp = useCombatStore((state) => state.setHunterHp);
  const [deathOpen, setDeathOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const serverVitals = combatVitals(combatant, characters);
  const hunterCard = combatant.kind === "pc" && combatant.characterId
    ? characters.find((candidate) => candidate.id === combatant.characterId)
    : undefined;
  const hunterHp = useOptimisticHunterHp({ hp: serverVitals.currentHp, notTonight: hunterCard?.notTonight === true });
  const vitals = combatant.kind === "pc" && serverVitals.maxHp !== null && hunterHp.current.hp !== null
    ? { ...serverVitals, currentHp: hunterHp.current.hp, damageTaken: Math.max(0, serverVitals.maxHp - hunterHp.current.hp) }
    : serverVitals;
  // A Hunter is only ever dead because the DM said so (Not Tonight! means 0 HP
  // is not death); an enemy is dead at 0 HP too.
  const dead = combatant.defeated === true
    || (combatant.kind === "monster" && vitals.currentHp !== null && vitals.currentHp <= 0);
  const monster = combatant.kind === "monster";

  function setDamage(damage: number) {
    if (vitals.maxHp === null) {
      // Unknown max HP: keep a running tally until the DM learns the maximum.
      if (monster && vitals.damageTaken !== null) void patch(game.id, combatant.id, { damageTaken: damage });
      return;
    }
    // Damage is deliberately NOT clamped to the HP maximum: Instant Death keys
    // off the damage remaining after a Hunter drops to 0, so `currentHp` must
    // be allowed to go negative for the DM to see it. The health bar clamps at
    // 0% on its own.
    if (!monster) {
      applyHunterHp(vitals.maxHp, vitals.maxHp - damage);
      return;
    }
    void patch(game.id, combatant.id, {
      currentHp: vitals.maxHp - damage,
      defeated: damage >= vitals.maxHp,
    });
  }

  /** Hunters: the change lands on their own character sheet too, and follows
   * Not Tonight!, Dying and Instant Death ([pages 21, 45]). */
  function applyHunterHp(maxHp: number, nextHp: number) {
    const previous = vitals.currentHp ?? maxHp;
    const outcome = hunterDamageOutcome(previous, nextHp, maxHp, hunterHp.current.notTonight);
    setNotice(outcome.kind === "not-tonight" ? "Not Tonight! spent — stays at 1 HP."
      : outcome.kind === "instant-death" ? "Instant Death — the damage left over reaches the HP maximum."
        : outcome.kind === "dying" && previous > 0 ? "Down to 0 HP — Dying and Unconscious." : null);
    // Apple HIG: notification haptics for outcomes that matter.
    if (outcome.kind === "instant-death") haptic("error");
    else if (outcome.kind === "dying" && previous > 0) haptic("warning");
    else if (outcome.kind === "not-tonight") haptic("warning");
    const spend = outcome.kind === "not-tonight";
    hunterHp.enqueue(
      { hp: outcome.hp, notTonight: hunterHp.current.notTonight && !spend },
      () => writeHunterHp(outcome, spend),
    );
  }

  /** One queued write; reads the live combatant, since taps queue up. */
  async function writeHunterHp(outcome: ReturnType<typeof hunterDamageOutcome>, spend: boolean) {
    if (!await setHunterHp(game.id, combatant, outcome.hp, spend)) return false;
    const live = useCombatStore.getState().combatants.find((entry) => entry.id === combatant.id) ?? combatant;
    const down = outcome.kind === "dying" || outcome.kind === "instant-death";
    const up = outcome.kind === "recovered" || outcome.kind === "not-tonight";
    const missing = DYING_CONDITIONS.filter((id) => !live.conditions.includes(id));
    if (down && missing.length) {
      await patch(game.id, combatant.id, {
        conditions: [...live.conditions, ...missing],
        conditionSince: { ...(live.conditionSince ?? {}), ...Object.fromEntries(missing.map((id) => [id, round])) },
      });
    } else if (up && DYING_CONDITIONS.some((id) => live.conditions.includes(id))) {
      const since = { ...(live.conditionSince ?? {}) };
      for (const id of DYING_CONDITIONS) delete since[id];
      await patch(game.id, combatant.id, {
        conditions: live.conditions.filter((id) => !(DYING_CONDITIONS as readonly string[]).includes(id)),
        conditionSince: since,
      });
    }
    if (outcome.kind === "instant-death" && hunterCard && !dead) setDeathOpen(true);
    return true;
  }

  const dying = !monster && !dead && vitals.currentHp !== null && vitals.currentHp <= 0;
  // core-rulebook.txt [page 29]: Bloodied while current HP is at or below half
  // the HP maximum, rounded down. Shown only while still up (not dying/dead).
  const bloodied = !dead && !dying && vitals.currentHp !== null && vitals.currentHp > 0 && isBloodied(vitals.currentHp, vitals.maxHp);

  return (
    <article
      className={`battle-row battle-card${canManage ? " has-actions" : ""}${monster ? " is-monster" : ""}${active ? " is-current" : ""}${dead ? " is-dead" : ""}${bloodied ? " is-bloodied" : ""}`}
      data-testid={`battle-combatant-${combatant.id}`}
      aria-current={active ? "true" : undefined}
    >
      <header className="battle-card-head">
        <span className="battle-position" aria-label={`Turn position ${position}`}>{position}</span>
        <div className="battle-name">
          <strong title={combatant.name}>{combatant.name}</strong>
          <span className="battle-kind-line"><span className="battle-kind">{monster ? (dead ? "Enemy · dead" : "Enemy") : (dead ? "Hunter · fallen" : dying ? "Hunter · dying" : `Hunter${vitals.speed !== null ? ` · ${vitals.speed} ft` : ""}`)}</span>{bloodied && <span className="battle-bloodied" title="At or below half its Hit Point maximum">Bloodied</span>}</span>
        </div>
        {active && <span className="battle-acting">Acting</span>}
        {canManage && (
          <BattleRowMenu
          combatant={combatant}
          game={game}
          vitals={vitals}
          hunterCard={hunterCard}
          dead={dead}
          disabled={disabled}
          encounterCombatants={encounterCombatants}
          onAddDamage={(amount) => setDamage((vitals.damageTaken ?? 0) + amount)}
          deathOpen={deathOpen}
          onDeathOpenChange={setDeathOpen}
          onSetMaxHp={(maxHp) => {
            const damage = vitals.damageTaken ?? 0;
            void patch(game.id, combatant.id, {
              maxHp,
              currentHp: maxHp - damage,
              damageTaken: null,
              defeated: damage >= maxHp,
              ...(combatant.baseStats ? { baseStats: { ...combatant.baseStats, maxHp } } : {}),
            });
          }}
        />
        )}
      </header>
      {notice && canManage && <p className="battle-notice" role="status">{notice}</p>}
      {/* Never locked while a save is in flight: the DM can tap Damage/Heal as often as they like. */}
      <BattleHealthCell name={combatant.name} vitals={vitals} canManage={canManage} disabled={false} dead={dead} onSetDamage={setDamage} />
      <div className="battle-stats">
        <BattleStepper
          className="battle-ac"
          icon={<ShieldIcon />}
          label="Armor class"
          name={combatant.name}
          noun="armor class"
          value={vitals.ac}
          min={0}
          max={99}
          canManage={canManage}
          disabled={disabled}
          onChange={(ac) => void patch(game.id, combatant.id, { ac })}
        />
        <BattleStepper
          className="battle-initiative"
          icon={<BoltIcon />}
          label="Initiative"
          name={combatant.name}
          noun="initiative"
          value={combatant.initiative}
          min={-99}
          max={99}
          canManage={canManage}
          disabled={disabled}
          editable
          onChange={(initiative) => void patch(game.id, combatant.id, { initiative })}
        />
      </div>
      <BattleConditionsCell combatant={combatant} game={game} round={round} canManage={canManage} disabled={disabled} />
    </article>
  );
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 9.6 4.1-1.3 7-5.2 7-9.6V6l-7-3Z" /></svg>;
}

function BoltIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>;
}
