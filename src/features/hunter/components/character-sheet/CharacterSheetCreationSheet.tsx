import { AppAutoReasonsHidden, type AppSheetModel } from "../appsheet/appSheetShared";
import { CharacterSheetPageStack } from "./CharacterSheetPageStack";
import { CharacterSheetUpgrade } from "./CharacterSheetUpgrade";

export function CharacterSheetCreationSheet({
  model,
  onBack,
  onComplete,
}: {
  model: AppSheetModel;
  onBack: () => void;
  onComplete: () => void;
}) {
  return <CharacterSheetPageStack
    panel="upgrade"
    onExit={onBack}
    root={{
      id: "create-hunter",
      title: "Create hunter",
      content: <AppAutoReasonsHidden>
        <CharacterSheetUpgrade model={model} creating onComplete={onComplete} />
      </AppAutoReasonsHidden>,
    }}
  />;
}
