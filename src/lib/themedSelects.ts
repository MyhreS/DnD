/** Dropdown lists in the app's own style on desktop.
 *
 * A native `<select>` opens a list drawn by the operating system (bright white
 * on macOS and Windows) that CSS can't reach. With a mouse or trackpad, this
 * opens our own list instead, built from the select's options and styled with
 * the theme. The select itself stays the visible control and the source of
 * truth: choosing an option sets its value and fires the usual `change` event,
 * so every existing `onChange` keeps working. Touch devices keep the system
 * picker (the iOS wheel / Android sheet), as Apple's guidelines recommend. */

interface OpenMenu {
  select: HTMLSelectElement;
  menu: HTMLElement;
  items: HTMLElement[];
  active: number;
}

let open: OpenMenu | null = null;
let lastPointer = "mouse";
let typed = "";
let typedTimer = 0;

const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;

function usable(select: HTMLSelectElement): boolean {
  return !select.disabled && !select.multiple && select.size <= 1;
}

function choose(select: HTMLSelectElement, value: string) {
  close();
  select.focus({ preventScroll: true });
  if (select.value === value) return;
  // React tracks the value it last saw; set through the native setter so the
  // change event is reported, then fire the events a real choice fires.
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function setActive(index: number) {
  if (!open) return;
  open.items[open.active]?.classList.remove("is-active");
  open.active = index;
  const item = open.items[index];
  if (!item) return;
  item.classList.add("is-active");
  open.menu.setAttribute("aria-activedescendant", item.id);
  item.scrollIntoView({ block: "nearest" });
}

function step(direction: 1 | -1) {
  if (!open) return;
  let index = open.active;
  for (let tries = 0; tries < open.items.length; tries += 1) {
    index = Math.max(0, Math.min(open.items.length - 1, index + direction));
    if (open.items[index]?.getAttribute("aria-disabled") !== "true") break;
  }
  setActive(index);
}

function position(select: HTMLSelectElement, menu: HTMLElement) {
  const rect = select.getBoundingClientRect();
  const gap = 6;
  const below = window.innerHeight - rect.bottom - gap - 12;
  const above = rect.top - gap - 12;
  const flip = below < 220 && above > below;
  const room = Math.max(160, flip ? above : below);
  menu.style.minWidth = `${Math.max(rect.width, 180)}px`;
  menu.style.maxWidth = `${Math.min(420, window.innerWidth - 24)}px`;
  menu.style.maxHeight = `${Math.min(380, room)}px`;
  const width = menu.offsetWidth;
  menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
  if (flip) {
    menu.style.top = "";
    menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    menu.style.bottom = "";
    menu.style.top = `${rect.bottom + gap}px`;
  }
}

function build(select: HTMLSelectElement): OpenMenu {
  const menu = document.createElement("div");
  menu.className = "app-select-menu";
  menu.setAttribute("role", "listbox");
  menu.tabIndex = -1;
  const label = select.getAttribute("aria-label") ?? select.labels?.[0]?.textContent?.trim();
  if (label) menu.setAttribute("aria-label", label);
  const items: HTMLElement[] = [];
  let selected = -1;

  const addOption = (option: HTMLOptionElement, parent: HTMLElement) => {
    if (option.hidden) return;
    const item = document.createElement("div");
    item.className = "app-select-option";
    item.id = `app-select-${Math.random().toString(36).slice(2)}`;
    item.setAttribute("role", "option");
    item.textContent = option.textContent;
    const disabled = option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled);
    if (disabled) item.setAttribute("aria-disabled", "true");
    if (option.selected) {
      item.setAttribute("aria-selected", "true");
      selected = items.length;
    }
    item.addEventListener("pointerdown", (event) => event.preventDefault());
    item.addEventListener("click", () => { if (!disabled) choose(select, option.value); });
    item.addEventListener("pointermove", () => {
      const index = items.indexOf(item);
      if (index !== open?.active && !disabled) setActive(index);
    });
    parent.appendChild(item);
    items.push(item);
  };

  for (const child of Array.from(select.children)) {
    if (child instanceof HTMLOptGroupElement) {
      const group = document.createElement("div");
      group.className = "app-select-group";
      group.setAttribute("role", "group");
      const heading = document.createElement("div");
      heading.className = "app-select-group-label";
      heading.textContent = child.label;
      group.setAttribute("aria-label", child.label);
      group.appendChild(heading);
      for (const option of Array.from(child.children)) {
        if (option instanceof HTMLOptionElement) addOption(option, group);
      }
      menu.appendChild(group);
    } else if (child instanceof HTMLOptionElement) {
      addOption(child, menu);
    }
  }
  return { select, menu, items, active: selected };
}

function openMenu(select: HTMLSelectElement) {
  close();
  const built = build(select);
  if (!built.items.length) return;
  open = built;
  // Inside a pop-up, keep the list in its DOM so outside-click logic sees it
  // as inside; the popover top layer puts it above everything either way.
  const host = select.closest<HTMLElement>("[role='dialog'], dialog") ?? document.body;
  host.appendChild(built.menu);
  if (typeof built.menu.showPopover === "function") {
    built.menu.setAttribute("popover", "manual");
    built.menu.showPopover();
  }
  select.setAttribute("aria-expanded", "true");
  position(select, built.menu);
  setActive(built.active >= 0 ? built.active : 0);
}

function close() {
  if (!open) return;
  open.select.removeAttribute("aria-expanded");
  open.menu.remove();
  open = null;
}

function onPointerDown(event: PointerEvent) {
  lastPointer = event.pointerType;
  if (open && open.menu.contains(event.target as Node)) return;
  const select = (event.target as Element | null)?.closest?.("select");
  if (event.pointerType === "touch" || event.button !== 0 || !(select instanceof HTMLSelectElement) || !usable(select)) {
    close();
    return;
  }
  event.preventDefault();
  if (open?.select === select) {
    close();
    return;
  }
  select.focus({ preventScroll: true });
  openMenu(select);
}

function onMouseDown(event: MouseEvent) {
  // Safari opens the system list on mousedown even when pointerdown was
  // cancelled; stop it for any select this module handles (not for touch).
  if (lastPointer === "touch") return;
  const select = (event.target as Element | null)?.closest?.("select");
  if (select instanceof HTMLSelectElement && usable(select)) event.preventDefault();
}

function onKeyDown(event: KeyboardEvent) {
  if (open) {
    const { select, items, active } = open;
    if (event.key === "ArrowDown") { event.preventDefault(); step(1); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); step(-1); return; }
    if (event.key === "Home") { event.preventDefault(); setActive(0); return; }
    if (event.key === "End") { event.preventDefault(); setActive(items.length - 1); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = items[active];
      if (item && item.getAttribute("aria-disabled") !== "true") item.click();
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      close();
      if (event.key === "Escape") select.focus({ preventScroll: true });
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      window.clearTimeout(typedTimer);
      typed += event.key.toLowerCase();
      typedTimer = window.setTimeout(() => { typed = ""; }, 700);
      const index = items.findIndex((item) => item.getAttribute("aria-disabled") !== "true" && (item.textContent ?? "").trim().toLowerCase().startsWith(typed));
      if (index >= 0) setActive(index);
      event.preventDefault();
    }
    return;
  }
  const select = event.target;
  if (!(select instanceof HTMLSelectElement) || !usable(select)) return;
  const opens = event.key === " " || event.key === "Enter" || event.key === "F4"
    || (event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp"));
  if (opens) {
    event.preventDefault();
    openMenu(select);
  }
}

function onScroll(event: Event) {
  if (open && !open.menu.contains(event.target as Node)) close();
}

export function installThemedSelects(): () => void {
  if (typeof window === "undefined") return () => {};
  // Phones and tablets keep the system picker.
  const fine = window.matchMedia("(any-pointer: fine)");
  if (!fine.matches) return () => {};
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("mousedown", onMouseDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", close);
  window.addEventListener("blur", close);
  return () => {
    close();
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", close);
    window.removeEventListener("blur", close);
  };
}
