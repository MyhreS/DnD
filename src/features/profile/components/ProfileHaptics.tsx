import { HapticTap } from "@/components/HapticTap";
import { haptic, isIos } from "@/lib/haptics";

/** Safari's native switch control (not yet in React's types). */
const SWITCH = { switch: "" } as object;

/** Lets a player check that their phone ticks. On iPhone the real switch is
 * the baseline: if it doesn't tick, the phone's own haptics are off. */
export function ProfileHaptics() {
  const ios = isIos();
  const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  return (
    <div className="card profile-haptics">
      <p className="eyebrow">Haptics</p>
      {ios && (
        <label className="profile-haptics-switch">
          <input type="checkbox" {...SWITCH} />
          <span>Tap this switch. Do you feel a tick?</span>
        </label>
      )}
      {ios || canVibrate ? (
        <>
          <p className="faint profile-haptics-note">
            Buttons like Damage, Heal, Next turn and Save upgrade tick when tapped.
            {ios && " If the switch doesn’t tick, turn on Settings → Sounds & Haptics → System Haptics, and turn off Low Power Mode."}
          </p>
          <HapticTap>
            <button type="button" className="btn btn-ghost" onClick={() => haptic("success")}>Test a tap</button>
          </HapticTap>
        </>
      ) : (
        <p className="faint profile-haptics-note">This device or browser has no haptics.</p>
      )}
    </div>
  );
}
