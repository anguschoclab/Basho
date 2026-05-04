/**
 * NewGameWizard.tsx
 *
 * Cinematic onboarding flow for new stable inaugurations.
 * Features a "Rich Aesthetics" Heroic layout with Noto Serif JP overlays.
 * Architecturally cleaned up to use centralized engine utilities.
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Helmet } from "react-helmet";
import { makeDeterministicSeed } from "@/utils/engineUtils";
import { generateOyakataName } from "@/engine/shikona";
import type { Heya } from "@/engine/types/heya";
import { ExhibitionBout } from "@/components/onboarding/ExhibitionBout";
import { WizardHeader } from "@/components/wizard/WizardHeader";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { IdentityStep } from "@/components/wizard/IdentityStep";
import { FactionStep } from "@/components/wizard/FactionStep";
import { StableStep } from "@/components/wizard/StableStep";
import { LoadingState } from "@/components/wizard/LoadingState";
import { OYAKATA_BACKSTORIES, ICHIMON_FACTIONS } from "@/components/wizard/wizardConstants";

export default function NewGameWizard() {
  const navigate = useNavigate();
  const { createWorld, state, quickSave } = useGame();

  useEffect(() => {
    if (!state.world) {
      createWorld(makeDeterministicSeed("world"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createWorld is stable from context, only run once when world is missing
  }, [state.world]);

  const [step, setStep] = useState(1);
  const [oyakataName, setOyakataName] = useState("");
  const [background, setBackground] = useState(OYAKATA_BACKSTORIES[0].id);
  const [ichimon, setIchimon] = useState(ICHIMON_FACTIONS[0].id);
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(null);

  const world = state.world;
  const stables = useMemo<Heya[]>(() => (!world ? [] : Array.from(world.heyas.values())), [world]);

  const handleRandomName = () => {
    const seed = `wizard::random::${Date.now()}`;
    setOyakataName(generateOyakataName(seed));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = () => {
    if (!world || !selectedHeyaId) return;
    createWorld(world.seed, selectedHeyaId);
    setStep(4);
    // Autosave after world creation completes
    setTimeout(() => {
      if (state.world) {
        quickSave();
      }
    }, 100);
  };

  const handleExhibitionComplete = () => {
    navigate({ to: "/" });
  };

  if (!world) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center hero-gradient scroll-smooth">
      <Helmet>
        <title>New Career Setup | Basho</title>
      </Helmet>

      <WizardHeader currentStep={step} />

      <main className="max-w-4xl w-full px-6 -mt-8 relative z-20 pb-32">
        {step === 1 && (
          <IdentityStep
            oyakataName={oyakataName}
            background={background}
            onNameChange={setOyakataName}
            onBackgroundChange={setBackground}
            onRandomName={handleRandomName}
            onNext={handleNext}
          />
        )}

        {step === 2 && (
          <FactionStep
            ichimon={ichimon}
            onIchimonChange={setIchimon}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}

        {step === 3 && (
          <StableStep
            stables={stables}
            selectedHeyaId={selectedHeyaId}
            onHeyaSelect={setSelectedHeyaId}
            onPrev={handlePrev}
            onFinish={handleFinish}
          />
        )}
        {/* ── STEP 4: EXHIBITION BOUT ── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-10 duration-700">
            <div className="glass rounded-lg shadow-2xl border-2 border-primary/10 overflow-hidden">
              <ExhibitionBout onComplete={handleExhibitionComplete} />
            </div>
          </div>
        )}
      </main>

      <WizardFooter
        oyakataName={oyakataName}
        background={background}
        ichimon={ichimon}
        world={world}
      />
    </div>
  );
}
