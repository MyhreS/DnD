import { useTheme } from "@/app/theme";

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);

  return (
    <div className="card">
      <p className="eyebrow">Appearance</p>
      <div className="btn-row" style={{ marginTop: 8 }}>
        <button
          className={`btn ${theme === "dark" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTheme("dark")}
        >
          🌙 Dark
        </button>
        <button
          className={`btn ${theme === "light" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setTheme("light")}
        >
          ☀️ Light
        </button>
      </div>
    </div>
  );
}
