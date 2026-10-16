import { useCombatStore } from "@/features/play/store/combatStore";
import type { Combatant, Game, HunterCard } from "@/types";
import { combatVitals } from "../lib/combatPresentation";
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
  const vitals = combatVitals(combatant, characters);
  const hunterCard = combatant.kind === "pc" && combatant.characterId
    ? characters.find((candidate) => candidate.id === combatant.characterId)
    : undefined;
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
      // Hunters: the change lands on their own character sheet too.
      void setHunterHp(game.id, combatant, vitals.maxHp - damage);
      return;
    }
    void patch(game.id, combatant.id, {
      currentHp: vitals.maxHp - damage,
      defeated: damage >= vitals.maxHp,
    });
  }

  return (
    <article
      className={`battle-row battle-card${canManage ? " has-actions" : ""}${monster ? " is-monster" : ""}${active ? " is-current" : ""}${dead ? " is-dead" : ""}`}
      data-testid={`battle-combatant-${combatant.id}`}
      aria-current={active ? "true" : undefined}
    >
      <header className="battle-card-head">
        <span className="battle-position" aria-label={`Turn position ${position}`}>{position}</span>
        <div className="battle-name">
          <strong title={combatant.name}>{combatant.name}</strong>
          <span className="battle-kind">{monster ? (dead ? "Enemy · dead" : "Enemy") : (dead ? "Hunter · fallen" : `Hunter${vitals.speed !== null ? ` · ${vitals.speed} ft` : ""}`)}</span>
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
      <BattleHealthCell name={combatant.name} vitals={vitals} canManage={canManage} disabled={disabled} dead={dead} onSetDamage={setDamage} />
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
