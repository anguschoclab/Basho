
## 2026-10-10 - [RNG Branch Coverage] **Gap:** [Simulation branches dependent on RNG thresholds] **Learning:** [Small random event triggers (injury/rivalry) required forcing the RNG] **Pattern:** [Override world.rng.next = () => 0 via vi.spyOn(rngModule, 'rngForWorld') to guarantee < threshold rolls without flakiness]

## 2026-10-10 - [Mocking Prototypes vs Namespaces] **Gap:** [Spying on ESM namespaces] **Learning:** [vitest does not support directly spying on ESM namespaces] **Pattern:** [Mock prototype methods instead, e.g. vi.spyOn(rngModule.SeededRNG.prototype, 'next')]
