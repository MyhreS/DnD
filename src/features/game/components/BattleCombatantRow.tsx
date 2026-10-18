import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, HunterCard } from "@/types";
import { useState } from "react";
import { isBloodied } from "@/lib/character";
import { useBattleRowHealth } from "../hooks/useBattleRowHealth";
import { BattleHunterState } from "./BattleHunterState";
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
  const [deathOpen, setDeathOpen] = useState(false);
  const hunterCard = combatant.kind === "pc" && combatant.characterId
    ? characters.find((candidate) => candidate.id === combatant.characterId)
    : undefined;
  const monster = combatant.kind === "monster";
  const health = useBattleRowHealth({ combatant, characters, game });
  const { vitals } = health;
  // A Hunter is only ever dead because the DM said so (Not Tonight! means 0 HP
  // is not death); an enemy is dead at 0 HP too.
  const dead = combatant.defeated === true
    || (monster && vitals.currentHp !== null && vitals.currentHp <= 0);

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
          onAddDamage={health.damageBy}
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
      {/* Players keep their own Hunter's HP; the DM manages enemies only. Never
          locked while a save is in flight: tap Damage/Heal as often as needed. */}
      <BattleHealthCell name={combatant.name} vitals={vitals} canManage={canManage && monster} disabled={false} dead={dead} onDamage={health.damageBy} onHeal={health.healBy} onSetTemp={health.setTemp} />
      {hunterCard && <BattleHunterState card={hunterCard} />}
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
