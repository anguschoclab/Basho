const fs = require('fs');
let code = fs.readFileSync('src/engine/__tests__/npcAI.test.ts', 'utf8');

// Replace standard require stubbing with vitest vi.spyOn
code = code.replace(
`    import("../talentpool").then(talentpool => {
       const originalFill = talentpool.fillVacanciesForNPC;
       let calledWithVacancies: any = null;
       // @ts-ignore
       talentpool.fillVacanciesForNPC = (w, vacancies) => {
         calledWithVacancies = vacancies;
       };

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         expect(calledWithVacancies).toBeDefined();
         expect(calledWithVacancies["heya1"]).toBe(8); // target size is 8
         expect(calledWithVacancies["heya2"]).toBeUndefined(); // Frozen

         // Restore
         // @ts-ignore
         talentpool.fillVacanciesForNPC = originalFill;
       });
    });`,
`    import("../talentpool").then(async (talentpool) => {
       const { vi } = await import("vitest");
       let calledWithVacancies: any = null;
       const spy = vi.spyOn(talentpool, "fillVacanciesForNPC").mockImplementation((w, vacancies) => {
         calledWithVacancies = vacancies;
       });

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         expect(calledWithVacancies).toBeDefined();
         expect(calledWithVacancies["heya1"]).toBe(8); // target size is 8
         expect(calledWithVacancies["heya2"]).toBeUndefined(); // Frozen

         spy.mockRestore();
       });
    });`
);

code = code.replace(
`    import("../talentpool").then(talentpool => {
       const originalFill = talentpool.fillVacanciesForNPC;
       let called = false;
       // @ts-ignore
       talentpool.fillVacanciesForNPC = () => { called = true; };

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         // Should not have been called because 35 >= 30
         expect(called).toBe(false);

         // Restore
         // @ts-ignore
         talentpool.fillVacanciesForNPC = originalFill;
       });
    });`,
`    import("../talentpool").then(async (talentpool) => {
       const { vi } = await import("vitest");
       let called = false;
       const spy = vi.spyOn(talentpool, "fillVacanciesForNPC").mockImplementation(() => { called = true; });

       import("../npcAI").then(m => {
         m.tickMonthly(world);

         // Should not have been called because 35 >= 30
         expect(called).toBe(false);

         spy.mockRestore();
       });
    });`
);

fs.writeFileSync('src/engine/__tests__/npcAI.test.ts', code, 'utf8');
