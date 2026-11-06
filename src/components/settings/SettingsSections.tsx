/**
 * SettingsSections.tsx
 *
 * Settings page cards — appearance (theme), save & load (autosave),
 * keyboard shortcuts, simulation (style drift), and about.
 */

import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/state/game/useGame";
import { useGameStore } from "@/state/stores/gameStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Keyboard, Palette, Save, Info, Dumbbell, Languages } from "lucide-react";
import { useState } from "react";
import { SHORTCUT_REFERENCE } from "@/hooks/useKeyboardShortcuts";
import { t, setLocale, getLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { getStoredLocale, setStoredLocale } from "@/pages/settingsHelpers";

/** Appearance card — dark mode toggle. */
export function AppearanceCard() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" /> Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="theme-toggle" className="text-sm font-medium">
              Dark Mode
            </Label>
            <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
          </div>
          <Switch
            id="theme-toggle"
            checked={resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Save & Load card — autosave toggle + slot/shortcut notes. */
export function SaveLoadCard({
  autosaveOn,
  onToggle,
}: {
  autosaveOn: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" /> Save & Load
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="autosave-toggle" className="text-sm font-medium">
              Autosave
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically save after each basho day and phase transitions
            </p>
          </div>
          <Switch id="autosave-toggle" checked={autosaveOn} onCheckedChange={onToggle} />
        </div>
        <Separator />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 10 manual save slots available</p>
          <p>• Autosave uses a separate dedicated slot</p>
          <p>
            • Use{" "}
            <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
              Ctrl+S
            </Badge>{" "}
            for quick save
          </p>
          <p>
            • Use{" "}
            <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">
              Ctrl+⇧+S
            </Badge>{" "}
            to open Save/Load dialog
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Keyboard shortcuts reference card. */
export function ShortcutsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" /> Keyboard Shortcuts
        </CardTitle>
        <CardDescription>Quick actions while playing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {SHORTCUT_REFERENCE.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{s.action}</span>
              <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                {s.key}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Simulation card — style-drift toggle (world setting, pushed to worker). */
export function SimulationCard() {
  const { state, updateWorld } = useGame();
  const sendCommand = useGameStore((s) => s.sendCommand);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" /> Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="drift-toggle" className="text-sm font-medium">
              Style Drift (Phase 5)
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow stable training styles to gradually drift based on international influence
            </p>
          </div>
          <Switch
            id="drift-toggle"
            checked={!!state.world?.settings?.enableStyleDrift}
            onCheckedChange={(checked) => {
              if (state.world) {
                const next = {
                  ...state.world,
                  settings: {
                    ...(state.world.settings || {}),
                    enableStyleDrift: checked,
                  },
                };
                updateWorld(next);
                // updateWorld never reaches the worker — push the updated
                // world so the enableStyleDrift gate in
                // phase01_week_world_circuit sees the new value.
                sendCommand({ type: "LOAD_WORLD", world: next });
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Language card — UI locale picker (T3.2). */
export function LanguageCard() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = getStoredLocale();
    if (getLocale() !== stored) setLocale(stored);
    return stored;
  });

  const onChange = (next: Locale) => {
    setLocale(next);
    setStoredLocale(next);
    setLocaleState(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" /> {t("settings.language", undefined, "Language")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {t("settings.language.description", undefined, "Interface language")}
        </p>
        <div className="flex gap-2">
          {SUPPORTED_LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              aria-pressed={locale === loc}
              onClick={() => onChange(loc)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                locale === loc
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {t(`settings.language.${loc}`)}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** About card — app identity + save version. */
export function AboutCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" /> About
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Basho</strong> — 相撲経営シミュレーション
        </p>
        <p>A sumo stable management simulation.</p>
        <p className="text-xs">Save version: 1.0.0</p>
      </CardContent>
    </Card>
  );
}
