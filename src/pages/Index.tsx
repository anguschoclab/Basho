import { Helmet } from "react-helmet";
import { BoutViewer } from "@/components/game/BoutViewer";

/**
 * Index / Landing Page
 *
 * NOTE:
 * This is currently a demo-style entry point showing the BoutViewer.
 * In full gameplay flow, users typically land on Dashboard instead.
 * Safe to swap this component later without touching routing.
 */
const Index = () => {
  return (
    <>
      <Helmet>
        <title>Basho — Sumo Management Simulator</title>
        <meta
          name="description"
          content="Basho is a sumo management and simulation game. Train rikishi, manage your heya, and compete in authentic basho using all 82 official kimarite."
        />
      </Helmet>

      <main className="min-h-screen bg-background py-8">
        <BoutViewer />
      </main>
    </>
  );
};

export default Index;
