/**
 * NewGameWizard.tsx
 *
 * Cinematic onboarding flow for new stable inaugurations.
 * Features a "Rich Aesthetics" Heroic layout with Noto Serif JP overlays.
 * Architecturally cleaned up to use centralized engine utilities.
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Helmet } from "react-helmet";
import { makeDeterministicSeed } from "@/utils/engineUtils";
import { generateToshiyoriName } from "@/engine/shikona/toshiyoriNames";
import { SeededRNG } from "@/engine/rng";
import type { Heya } from "@/engine/types/heya";
import { ExhibitionBout } from "@/components/onboarding/ExhibitionBout";
import { WizardHeader } from "@/components/wizard/WizardHeader";
import { WizardFooter } from "@/components/wizard/WizardFooter";
import { IdentityStep } from "@/components/wizard/IdentityStep";
import { FactionStep } from "@/components/wizard/FactionStep";
import { StableStep } from "@/components/wizard/StableStep";
import { LoadingState } from "@/components/wizard/LoadingState";
import { OYAKATA_BACKSTORIES, ICHIMON_FACTIONS } from "@/constants/ui/wizard";
import { EntityCollection } from "@/engine/core/EntityCollection";

export default function NewGameWizard() {
  const navigate = useNavigate();
  const { heyaId: preselectedHeyaId } = useSearch({ from: "/new-game" });
  const { createWorld, state, quickSave } = useGame();

  useEffect(() => {
    if (!state.world) {
      createWorld(makeDeterministicSeed("world"));
    }
  }, [state.world, createWorld]);

  const [step, setStep] = useState(1);
  const [oyakataName, setOyakataName] = useState("");
  const [background, setBackground] = useState(OYAKATA_BACKSTORIES[0].id);
  const [ichimon, setIchimon] = useState(ICHIMON_FACTIONS[0].id);
  const [selectedHeyaId, setSelectedHeyaId] = useState<string | null>(preselectedHeyaId ?? null);

  const world = state.world;
  const stables = useMemo<Heya[]>(() => (!world ? [] : EntityCollection.getHeyas(world)), [world]);

  // When a heya is pre-selected, the wizard has 3 steps (skip StableStep)
  const totalSteps = preselectedHeyaId ? 3 : 4;

  const handleRandomName = () => {
    const rng = new SeededRNG(String(Date.now()));
    setOyakataName(generateToshiyoriName(rng));
  };

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  // Autosave once the world is fully initialized with player heya
  const quickSaveRef = useRef(quickSave);
  quickSaveRef.current = quickSave;
  useEffect(() => {
    if (state.world?.playerHeyaId && quickSaveRef.current) {
      quickSaveRef.current();
    }
  }, [state.world?.playerHeyaId]);

  const handleFinish = () => {
    if (!world || !selectedHeyaId) return;
    const config = {
      name: oyakataName.trim(),
      backstoryId: background,
      ichimon: (ichimon || undefined) as import("@/engine/types/economy").IchimonName | undefined,
    };
    createWorld(world.seed, selectedHeyaId, config);
    setStep(4);
  };

  // When pre-selected, step 2 skips directly to finish (step 4) instead of going to step 3
  const handleFactionNext = () => {
    if (preselectedHeyaId) {
      handleFinish();
    } else {
      handleNext();
    }
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

      <WizardHeader currentStep={step} totalSteps={totalSteps} />

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
            onNext={handleFactionNext}
            onPrev={handlePrev}
          />
        )}

        {step === 3 && !preselectedHeyaId && (
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
