export function Countdown({ target, now }: { target: Date; now: Date }) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(ms / 1000);
  const units = [
    { num: Math.floor(totalSec / 86400), lbl: "Days" },
    { num: Math.floor((totalSec % 86400) / 3600), lbl: "Hours" },
    { num: Math.floor((totalSec % 3600) / 60), lbl: "Min" },
    { num: totalSec % 60, lbl: "Sec" },
  ];
  return (
    <div className="countdown">
      {units.map((u) => (
        <div className="unit" key={u.lbl}>
          <div className="num">{String(u.num).padStart(2, "0")}</div>
          <div className="lbl">{u.lbl}</div>
        </div>
      ))}
    </div>
  );
}
