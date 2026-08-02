export function CombatRulesPanel() {
  return (
    <details className="combat-rules">
      <summary>Playtest rule: Combat Turn Timer</summary>
      <div>
        <h3>Turn Timer</h3>
        <p>Each player has 90 seconds to declare and resolve movement, Action, Bonus Action, item interactions, and other abilities. The timer starts when the DM announces the turn.</p>
        <p>When time expires, no new movement, action, attack, Bonus Action, item interaction, or optional effect may begin. An action already begun may finish resolving, then the turn immediately ends.</p>
        <p>An action begins at its first mechanical step: an attack roll, a saving throw, a required ability check, or the full declaration of target, area, and effect when no roll is required.</p>
        <p>Each attack in a multiattack is a separate resolution. An attack already rolled may finish; an additional attack not yet begun is lost.</p>
        <p>The DM may pause for rule clarification, adjudication, DM saving throws, or anything outside the player's control. Looking up your own features or deciding what to do does not pause the timer. DM-controlled turns are not timed.</p>
        <h3>Warden - Tactical Command</h3>
        <p>The designated Hunter Warden gets an unlimited strategy discussion before their 90-second timer. No movement, dice, actions, or effects may begin during this briefing.</p>
        <p>The Warden starts the timer when ready. It also starts automatically if the Warden moves, rolls, or begins resolving any part of the turn. If several Wardens are present, only one receives Tactical Command.</p>
      </div>
    </details>
  );
}

