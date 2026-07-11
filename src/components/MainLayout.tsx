import { NavLink } from "react-router-dom";
import { useSettings } from "@/app/settings";
import { Shell } from "./Shell";

/** Chrome for the main menu: account home, hunters, handbook, profile — no
 * campaign. This is where you create characters and read the rules. */
export function MainLayout() {
  // The DM overview tab only exists when Dungeon Master mode is on (Profile).
  const dmMode = useSettings((s) => s.dmMode);
  return (
    <Shell
      title="Catacombs & Starspawns"
      titleTo="/"
      nav={
        <>
          <NavLink to="/" end>Menu</NavLink>
          <NavLink to="/character">Hunters</NavLink>
          <NavLink to="/handbook">Handbook</NavLink>
          <NavLink to="/reference">Reference</NavLink>
          {dmMode && <NavLink to="/dm">DM</NavLink>}
        </>
      }
    />
  );
}
