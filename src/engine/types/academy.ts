/**
 * academy.ts — Youth Academy type definitions.
 *
 * A heya-level youth academy that the player funds and staffs, producing
 * an annual intake of junior recruits with development influenced by
 * academy investment, facilities, and coaching.
 */

/** Academy levels — higher levels produce better prospects and hold more. */
export type AcademyLevel = 1 | 2 | 3 | 4 | 5;

/** Academy staff roles. */
export type AcademyStaffRole = "head_coach" | "conditioning" | "nutrition" | "technique";

/** Academy staff member. */
export interface AcademyStaff {
  id: string;
  role: AcademyStaffRole;
  name: string;
  quality: number; // 0-100
  hiredAtYear: number;
}

/** Youth academy prospect — a young recruit being developed. */
export interface YouthProspect {
  id: string;
  shikona: string;
  age: number;
  region: string;
  potential: number; // 0-100
  currentAbility: number; // 0-100, starts low and grows
  developmentPoints: number; // accumulated training
  enrolledAtYear: number;
  enrolledAtWeek: number;
  developmentHistory: Array<{ week: number; ability: number }>;
}

/** Youth academy state stored on the heya. */
export interface YouthAcademyState {
  level: AcademyLevel;
  prospects: YouthProspect[];
  totalGraduated: number;
  budget: number; // weekly development budget
  staff: AcademyStaff[];
  lastIntakeYear: number; // year of last yearly intake
}

/** Configuration for academy management. */
export interface AcademyConfig {
  budget: number;
  staffRole?: AcademyStaffRole;
}
