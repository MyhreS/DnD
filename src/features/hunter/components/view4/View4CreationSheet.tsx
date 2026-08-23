import { AppAutoReasonsHidden, type AppSheetModel } from "../appsheet/appSheetShared";
import { View4PageStack } from "./View4PageStack";
import { View4Upgrade } from "./View4Upgrade";

export function View4CreationSheet({
  model,
  onBack,
  onComplete,
}: {
  model: AppSheetModel;
  onBack: () => void;
  onComplete: () => void;
}) {
  return <View4PageStack
    panel="upgrade"
    onExit={onBack}
    root={{
      id: "create-hunter",
      title: "Create hunter",
      content: <AppAutoReasonsHidden>
        <View4Upgrade model={model} creating onComplete={onComplete} />
      </AppAutoReasonsHidden>,
    }}
  />;
}
