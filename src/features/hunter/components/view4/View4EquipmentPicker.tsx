import { useCallback, useState, type ReactNode } from "react";
import { PickerContext, type EquipmentPickerOption, type EquipmentPickerRequest } from "./view4EquipmentPickerContext";
import { useView4PageNavigation } from "./view4PageNavigation";
import { View4UniquePickerForm } from "./View4UniquePickerForm";

function Picker({ request, close }: { request: EquipmentPickerRequest; close: () => void }) {
  const tabs = [
    ...(request.inventory ? ["inventory" as const] : []),
    ...(request.catalogue ? ["catalogue" as const] : []),
    ...(request.unique ? ["unique" as const] : []),
  ];
  const firstUsefulTab = request.inventory?.length
    ? "inventory"
    : request.catalogue?.length ? "catalogue" : request.unique ? "unique" : tabs[0] ?? "inventory";
  const [tab, setTab] = useState<(typeof tabs)[number]>(firstUsefulTab);
  const [search, setSearch] = useState("");
  const options = tab === "inventory" ? request.inventory : request.catalogue;
  const visible = options?.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  function choose(option: EquipmentPickerOption) {
    option.onChoose();
    close();
  }

  return <section className="v4-slot-picker" aria-label={request.title}>
      {request.hint && <p className="v4-slot-picker-hint">{request.hint}</p>}
      {request.current && <div className="v4-slot-current"><span><small>Equipped</small><strong>{request.current.name}</strong>{request.current.detail && <em>{request.current.detail}</em>}</span>{request.onRemove && <button type="button" onClick={() => { request.onRemove?.(); close(); }}>Remove</button>}</div>}
      <nav className="v4-slot-picker-tabs" aria-label="Item source">{tabs.map((entry) => <button type="button" aria-pressed={tab === entry} key={entry} onClick={() => setTab(entry)}>{entry === "catalogue" ? "Game catalogue" : entry}</button>)}</nav>
      {(tabs.length > 0) && <div className="v4-slot-picker-body">
        {tab !== "unique" && <>
          {(options?.length ?? 0) > 6 && <input className="v4-slot-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" />}
          <div className="v4-slot-option-list">{visible.map((option) => <button type="button" key={option.id} onClick={() => choose(option)}><span className={`v4-slot-option-icon is-${option.kind ?? "gear"}`}>{option.kind === "storage" ? "▣" : option.kind === "armor" ? "◇" : option.kind === "weapon" ? "†" : "•"}</span><span><strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}</span><b>{request.current ? "Replace" : "Add"}</b></button>)}</div>
          {!visible.length && <p className="v4-slot-empty">No matching items in this source.</p>}
        </>}
        {tab === "unique" && request.unique && <View4UniquePickerForm config={request.unique} onDone={close} />}
      </div>}
    </section>;
}

export function View4EquipmentPickerProvider({ children }: { children: ReactNode }) {
  const navigation = useView4PageNavigation();
  const closePicker = navigation.popPage;
  const openPicker = useCallback((request: EquipmentPickerRequest) => {
    navigation.pushPage({
      id: `equipment-picker-${request.title}-${request.current?.id ?? "empty"}`,
      title: request.title,
      eyebrow: "Choose equipment",
      content: <Picker request={request} close={closePicker} />,
    });
  }, [closePicker, navigation]);
  return <PickerContext.Provider value={{ openPicker, closePicker }}>{children}</PickerContext.Provider>;
}
