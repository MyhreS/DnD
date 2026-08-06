const ACTIVITY_LABELS = [
  "Working…",
  "Reading the thread…",
  "Spelunking through the app…",
  "Checking the result…",
];

export function WorkActivity({ placement }: { placement: "list" | "detail" }) {
  return (
    <span
      className={`work-activity work-activity-${placement}`}
      data-testid={`work-activity-${placement}`}
      role="status"
      aria-label="Workshop agent is working on this request"
    >
      <span className="work-activity-dots" aria-hidden>
        <i /><i /><i />
      </span>
      <span className="work-activity-labels" aria-hidden>
        {ACTIVITY_LABELS.map((label) => <span key={label}>{label}</span>)}
      </span>
    </span>
  );
}
