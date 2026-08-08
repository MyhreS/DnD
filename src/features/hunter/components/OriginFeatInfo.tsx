const ORIGIN_FEAT_DETAILS: Record<string, string> = {
  Alert: "Add your Proficiency Bonus to Initiative rolls. After rolling Initiative, you may swap your Initiative with a willing ally in the same combat.",
  Lucky: "You have Luck Points equal to your Proficiency Bonus, restored after a Long Rest. Spend one for Advantage on a D20 Test, or to give Disadvantage to an attack roll against you.",
  Listener: "Learn one Whisper of your choice. For that Whisper, Intelligence is your Rite Performing ability.",
  "Savage Attacker": "Once per turn when you hit with a weapon, roll that weapon's damage dice twice and use either roll.",
  Skilled: "Gain proficiency in any combination of three skills or tools of your choice. This feat can be taken more than once.",
  "Tavern Brawler": "Your Unarmed Strikes deal 1d4 + Strength bludgeoning damage, reroll damage dice that show 1, and you are proficient with improvised weapons. Once per turn, an Unarmed Strike can also push a target 5 feet.",
  Tough: "Your Hit Point maximum increases by twice your character level when you gain this feat, then by 2 more each time you gain a level.",
};

export function OriginFeatInfo({ feat }: { feat: string }) {
  const detail = ORIGIN_FEAT_DETAILS[feat];
  if (!detail) return feat;

  return (
    <span className="origin-feat-info">
      <span>{feat}</span>
      <details>
        <summary aria-label={`More about the ${feat} origin feat`} title={`More about ${feat}`}>i</summary>
        <span className="origin-feat-popover" role="tooltip">
          <b>{feat}</b>
          <span>{detail}</span>
          <a href="/codex?source=handbook&q=origin%20feats" target="_blank" rel="noopener noreferrer">Read all Origin feats ↗</a>
        </span>
      </details>
    </span>
  );
}
