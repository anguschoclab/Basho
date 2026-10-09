// SettingsPage.tsx — Game settings with autosave toggle, theme, keybinds reference
import { AppLayout } from "@/components/layout/AppLayout";
import { Settings } from "lucide-react";
import { useState } from "react";
import { getAutosaveEnabled, setAutosaveEnabled } from "./settingsHelpers";
import {
  AppearanceCard,
  SaveLoadCard,
  ShortcutsCard,
  SimulationCard,
  AboutCard,
} from "@/components/settings/SettingsSections";

/** settings page. */
export default function SettingsPage() {
  const [autosaveOn, setAutosaveOn] = useState(getAutosaveEnabled);

  const handleAutosaveToggle = (checked: boolean) => {
    setAutosaveOn(checked);
    setAutosaveEnabled(checked);
  };

  const managementTabs = [{ id: "settings", label: "Settings" }];

  return (
    <AppLayout pageTitle="Settings" subNavTabs={managementTabs} activeSubTab="settings">
      <title>Settings - Basho</title>
      <meta name="description" content="Game settings and preferences" />

      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Settings className="h-7 w-7" />
          Settings
        </h1>

        <AppearanceCard />
        <SaveLoadCard autosaveOn={autosaveOn} onToggle={handleAutosaveToggle} />
        <ShortcutsCard />
        <SimulationCard />
        <AboutCard />
      </div>
    </AppLayout>
  );
}
