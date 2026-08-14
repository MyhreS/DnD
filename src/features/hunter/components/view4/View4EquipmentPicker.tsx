import { useState, type ReactNode } from "react";
import { PickerContext, type EquipmentPickerOption, type EquipmentPickerRequest } from "./view4EquipmentPickerContext";
import { View4UniquePickerForm } from "./View4UniquePickerForm";

function Picker({ request, close }: { request: EquipmentPickerRequest; close: () => void }) {
  const tabs = [
    ...(request.inventory?.length ? ["inventory" as const] : []),
    ...(request.catalogue?.length ? ["catalogue" as const] : []),
    ...(request.unique ? ["unique" as const] : []),
  ];
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0] ?? "inventory");
  const [search, setSearch] = useState("");
  const options = tab === "inventory" ? request.inventory : request.catalogue;
  const visible = options?.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  function choose(option: EquipmentPickerOption) {
    option.onChoose();
    close();
  }

  return <div className="v4-slot-picker-backdrop" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && close()}>
    <section className="v4-slot-picker" role="dialog" aria-modal="true" aria-label={request.title}>
      <div className="v4-slot-picker-handle" />
      <header>
        <button type="button" onClick={close} aria-label="Back">←</button>
        <div><small>Choose equipment</small><h3>{request.title}</h3>{request.hint && <p>{request.hint}</p>}</div>
      </header>
      {request.current && <div className="v4-slot-current"><span><small>Equipped</small><strong>{request.current.name}</strong>{request.current.detail && <em>{request.current.detail}</em>}</span>{request.onRemove && <button type="button" onClick={() => { request.onRemove?.(); close(); }}>Remove</button>}</div>}
      {tabs.length > 1 && <nav className="v4-slot-picker-tabs" aria-label="Item source">{tabs.map((entry) => <button type="button" aria-pressed={tab === entry} key={entry} onClick={() => setTab(entry)}>{entry === "catalogue" ? "Game list" : entry}</button>)}</nav>}
      {(tabs.length > 0) && <div className="v4-slot-picker-body">
        {tab !== "unique" && <>
          {(options?.length ?? 0) > 6 && <input className="v4-slot-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" />}
          <div className="v4-slot-option-list">{visible.map((option) => <button type="button" key={option.id} onClick={() => choose(option)}><span className={`v4-slot-option-icon is-${option.kind ?? "gear"}`}>{option.kind === "storage" ? "▣" : option.kind === "armor" ? "◇" : option.kind === "weapon" ? "†" : "•"}</span><span><strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}</span><b>Add</b></button>)}</div>
          {!visible.length && <p className="v4-slot-empty">No matching items in this source.</p>}
        </>}
        {tab === "unique" && request.unique && <View4UniquePickerForm config={request.unique} onDone={close} />}
      </div>}
    </section>
  </div>;
}

export function View4EquipmentPickerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<EquipmentPickerRequest | null>(null);
  const closePicker = () => setRequest(null);
  return <PickerContext.Provider value={{ openPicker: setRequest, closePicker }}>
    {children}
    {request && <Picker key={`${request.title}-${request.current?.id ?? "empty"}`} request={request} close={closePicker} />}
  </PickerContext.Provider>;
}
