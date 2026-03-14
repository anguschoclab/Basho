// SettingsPage.tsx — Game settings with autosave toggle, theme, keybinds reference
import { Helmet } from "react-helmet";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTheme } from "@/components/ThemeProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Keyboard, Palette, Save, Info } from "lucide-react";
import { SHORTCUT_REFERENCE } from "@/hooks/useKeyboardShortcuts";
import { useEffect, useState } from "react";

const AUTOSAVE_ENABLED_KEY = "basho_autosave_enabled";

/**
 * Get autosave enabled.
 *  * @returns The result.
 */
export function getAutosaveEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    return val !== "false"; // default true
  } catch {
    return true;
  }
}

/**
 * Set autosave enabled.
 *  * @param enabled - The Enabled.
 */
export function setAutosaveEnabled(enabled: boolean) {
  try {
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));
  } catch { /* silent */ }
}

/** settings page. */
export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [autosaveOn, setAutosaveOn] = useState(getAutosaveEnabled);

  const handleAutosaveToggle = (checked: boolean) => {
    setAutosaveOn(checked);
    setAutosaveEnabled(checked);
  };

  const managementTabs = [
    { id: "settings", label: "Settings" },
  ];

  return (
    <AppLayout
      pageTitle="Settings"
      subNavTabs={managementTabs}
      activeSubTab="settings"
    >
      <Helmet>
        <title>Settings - Basho</title>
        <meta name="description" content="Game settings and preferences" />
      </Helmet>

      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Settings className="h-7 w-7" />
          Settings
        </h1>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="theme-toggle" className="text-sm font-medium">Dark Mode</Label>
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

        {/* Save & Load */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" /> Save & Load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autosave-toggle" className="text-sm font-medium">Autosave</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically save after each basho day and phase transitions
                </p>
              </div>
              <Switch
                id="autosave-toggle"
                checked={autosaveOn}
                onCheckedChange={handleAutosaveToggle}
              />
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 10 manual save slots available</p>
              <p>• Autosave uses a separate dedicated slot</p>
              <p>• Use <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">Ctrl+S</Badge> for quick save</p>
              <p>• Use <Badge variant="outline" className="font-mono text-[10px] px-1 py-0">Ctrl+⇧+S</Badge> to open Save/Load dialog</p>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
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
                <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{s.action}</span>
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
                    {s.key}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" /> About
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Basho</strong> — 相撲経営シミュレーション</p>
            <p>A sumo stable management simulation.</p>
            <p className="text-xs">Save version: 1.0.0</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
