import {
  FilePlus,
  FolderOpen,
  PanelLeft,
  Search,
  Settings,
  SquareTerminal,
} from "lucide-react";
import { useIde } from "@/lib/ide/store";
import { cn, modLabel } from "@/lib/utils";

const items = [
  {
    id: "explorer",
    label: "Explorer",
    shortcut: "B",
    icon: PanelLeft,
    run: (s: ReturnType<typeof useIde.getState>) => s.toggleExplorer(),
  },
  {
    id: "search",
    label: "Search workspace",
    shortcut: "Shift+F",
    icon: Search,
    run: (s: ReturnType<typeof useIde.getState>) => s.toggleSearch(),
  },
  {
    id: "open",
    label: "Open folder",
    shortcut: "O",
    icon: FolderOpen,
    run: (s: ReturnType<typeof useIde.getState>) => void s.openFolder(),
  },
  {
    id: "new",
    label: "New scratch",
    shortcut: "N",
    icon: FilePlus,
    run: (s: ReturnType<typeof useIde.getState>) => s.newScratch(),
  },
  {
    id: "terminal",
    label: "External terminal",
    shortcut: "`",
    icon: SquareTerminal,
    run: (s: ReturnType<typeof useIde.getState>) => void s.launchTerminal(),
  },
  {
    id: "settings",
    label: "Settings",
    shortcut: ",",
    icon: Settings,
    run: (s: ReturnType<typeof useIde.getState>) => s.toggleSettings(),
  },
] as const;

export function ActivityBar() {
  const explorerOpen = useIde((s) => s.explorerOpen);
  const settingsOpen = useIde((s) => s.settingsOpen);
  const searchOpen = useIde((s) => s.searchOpen);
  const mod = modLabel();

  const activeOf = (id: string) => {
    if (id === "explorer") return explorerOpen;
    if (id === "settings") return settingsOpen;
    if (id === "search") return searchOpen;
    return false;
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 items-center bg-activity text-muted",
        "border-border max-md:order-last max-md:h-14 max-md:w-full max-md:justify-around max-md:border-t",
        "md:h-full md:w-12 md:flex-col md:border-r md:py-2",
      )}
    >
      <div className="mb-3 hidden md:flex md:flex-col md:items-center">
        <span className="font-sans text-[11px] font-semibold tracking-tight text-fg">
          LS
        </span>
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeOf(item.id);
        return (
          <button
            key={item.id}
            type="button"
            title={`${item.label}  ${mod}+${item.shortcut}`}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => item.run(useIde.getState())}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-md transition-colors duration-150",
              "hover:bg-elevated hover:text-fg",
              active && "text-fg",
            )}
          >
            {active && (
              <span className="absolute bg-accent max-md:bottom-1 max-md:left-1/2 max-md:h-0.5 max-md:w-5 max-md:-translate-x-1/2 md:top-1/2 md:left-0 md:h-5 md:w-0.5 md:-translate-y-1/2" />
            )}
            <Icon className="size-5" strokeWidth={1.6} />
          </button>
        );
      })}
    </aside>
  );
}
