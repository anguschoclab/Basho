## 2025-03-05 - Redundant type casting for Heya updates in YouthAcademyService
**Finding:** The `Heya` interface correctly defines the optional `youthAcademy` property with the correct `YouthAcademyState` type, but legacy casting `(heya as unknown as Record<string, unknown>)` was still being used when calling `builder.updateHeya`.
**Learning:** Legacy casts were likely introduced before `youthAcademy` was formally added to the `Heya` interface type definitions.
**Constraint:** Use standard partial typing (`{ youthAcademy: { ... } }`) directly when updating `Heya` via `builder.updateHeya(heyaId, update)` rather than spreading full, unknown-cast entities into the partial update payload.

## 2025-03-05 - Double-casting partial entities to avoid TypeScript complaints
**Finding:** In `YouthAcademyService.promoteIntake`, a newly generated, loosely structured rikishi was passed to `builder.addRikishi` using an aggressive double cast `as unknown as import("../../types/rikishi").Rikishi` to silence the type-checker on missing properties.
**Learning:** While `builder.addRikishi` strictly demands a full `Rikishi` interface, dynamically generated early-stage rikishi often lack deep fields (like `careerHistory`, `milestones`, etc.).
**Constraint:** To improve type hygiene without altering runtime generation logic, cast these partial objects as `import("../../types/rikishi").Rikishi` directly instead of using the fully opaque `unknown` intermediate step.
