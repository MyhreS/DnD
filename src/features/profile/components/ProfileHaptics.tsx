import { useState } from "react";
import { haptic, iosHapticMethod, isIos, setIosHapticMethod, type IosHapticMethod } from "@/lib/haptics";

/** Safari's native switch control (not yet in React's types). */
const SWITCH = { switch: "" } as object;

const METHODS: Array<{ id: IosHapticMethod; label: string }> = [
  { id: "label", label: "Tick A" },
  { id: "input", label: "Tick B" },
  { id: "body", label: "Tick C" },
];

/** Lets a player feel each way the app can make the phone tick and keep the
 * one their phone answers to. iPhone only exposes a tick through a native
 * switch, so the real switch here is the baseline: if it doesn't tick when
 * tapped, the phone's own haptics are off. */
export function ProfileHaptics() {
  const ios = isIos();
  const [method, setMethod] = useState<IosHapticMethod>(() => iosHapticMethod());
  const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  function tryMethod(id: IosHapticMethod) {
    setIosHapticMethod(id);
    setMethod(id);
    haptic("success", id);
  }

  return (
    <div className="card profile-haptics">
      <p className="eyebrow">Haptics</p>
      {ios ? (
        <>
          <label className="profile-haptics-switch">
            <input type="checkbox" {...SWITCH} />
            <span>Tap this switch. Do you feel a tick?</span>
          </label>
          <p className="faint profile-haptics-note">
            If the switch doesn’t tick, turn on Settings → Sounds &amp; Haptics → System Haptics, and turn off Low Power Mode.
            Then tap each button below and keep the one you feel; the app uses it from then on.
          </p>
          <div className="btn-row">
            {METHODS.map((entry) => (
              <button key={entry.id} type="button" className={`btn ${method === entry.id ? "btn-primary" : "btn-ghost"}`} onClick={() => tryMethod(entry.id)}>
                {entry.label}
              </button>
            ))}
          </div>
        </>
      ) : canVibrate ? (
        <button type="button" className="btn btn-ghost" onClick={() => haptic("success")}>Test vibration</button>
      ) : (
        <p className="faint profile-haptics-note">This device or browser has no haptics.</p>
      )}
    </div>
  );
}
