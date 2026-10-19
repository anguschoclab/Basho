// SettingsPage.tsx — Game settings with autosave toggle, theme, keybinds reference
import { AppLayout } from "@/components/layout/AppLayout";
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

  return (
    <AppLayout pageTitle="Settings">
      <title>Settings - Basho</title>
      <meta name="description" content="Game settings and preferences" />

      <div className="space-y-6 max-w-2xl">
        <AppearanceCard />
        <SaveLoadCard autosaveOn={autosaveOn} onToggle={handleAutosaveToggle} />
        <ShortcutsCard />
        <SimulationCard />
        <AboutCard />
      </div>
    </AppLayout>
  );
}
