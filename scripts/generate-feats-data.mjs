import { readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync(new URL("../src/data/codex.generated.json", import.meta.url), "utf8"));
const abilities = [
  ["str", "strength"], ["dex", "dexterity"], ["con", "constitution"],
  ["int", "intelligence"], ["wis", "wisdom"], ["cha", "charisma"],
];
const categories = [
  ["Origin", "Origin Feats"], ["General", "General Feats"],
  ["Fighting Style", "Fighting Style Feats"], ["Epic Boon", "Epic Boon Feats"],
];

function titleCase(value) {
  return value.toLowerCase().split(" ").map((word, index) => (
    index > 0 && ["of", "the"].includes(word) ? word : word.replace(/(^|-)\p{L}/gu, (letter) => letter.toUpperCase())
  )).join(" ");
}

function abilityBenefit(name, description) {
  if (name === "Ability Score Improvement") return { abilityOptions: abilities.map(([key]) => key), abilityPoints: 2, abilityMaximum: 20 };
  const marker = description.indexOf("Ability Score Increase.");
  if (marker < 0) return { abilityOptions: [], abilityPoints: 0, abilityMaximum: 20 };
  const benefit = description.slice(marker, marker + 240).toLowerCase();
  const anyAbility = benefit.includes("one ability score of your choice") || benefit.includes("on ability score of your choice");
  return {
    abilityOptions: anyAbility ? abilities.map(([key]) => key) : abilities.filter(([, label]) => benefit.includes(label)).map(([key]) => key),
    abilityPoints: 1,
    abilityMaximum: /maximum of 30/i.test(benefit) ? 30 : 20,
  };
}

function parseCategory(category, term) {
  const text = source.entries.find((entry) => entry.term === term)?.body.join(" ") ?? "";
  const matches = [...text.matchAll(/(?:^|\s)([A-Z][A-Z' -]{2,}?)(?: \((Prerequisite:[^)]+)\))?\.\s/g)];
  return matches.map((match, index) => {
    const name = titleCase(match[1].trim());
    const start = (match.index ?? 0) + match[0].length;
    const description = text.slice(start, matches[index + 1]?.index ?? text.length).trim();
    return {
      id: `${category.toLowerCase().replaceAll(" ", "-")}:${name.toLowerCase().replaceAll(" ", "-")}`,
      name,
      category,
      prerequisite: match[2]?.replace(/^Prerequisite:\s*/i, "") ?? (category === "Epic Boon" ? "Level 19+" : ""),
      description,
      ...abilityBenefit(name, description),
    };
  });
}

const feats = categories.flatMap(([category, term]) => parseCategory(category, term));
writeFileSync(new URL("../src/data/feats.generated.json", import.meta.url), `${JSON.stringify(feats, null, 2)}\n`);
console.log(`Generated src/data/feats.generated.json: ${feats.length} feats.`);
