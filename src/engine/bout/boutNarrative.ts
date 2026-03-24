import { VOCABULARY, SENTENCE_TEMPLATES } from './grammarDefinitions';
import { TickResolutionEvent } from '../types/combat';
import { generateNarrative } from "../narrative";
import { rngFromSeed } from "../rng";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";

/**
 * Pure translator function. Consumes raw physics frames and maps them 
 * to event tokens defined in grammarDefinitions.ts and pbp.ts, and generates narrative.
 */
export function generateBoutNarrative(
  result: BoutResult,
  east: Rikishi,
  west: Rikishi,
  bashoName: BashoName | undefined,
  day: number,
  seed: string
): void {
  // Map log entries to narrative context
  const pbpLines = result.log.map((entry, idx) => {
    if (entry.phase === 'engagement' && entry.data?.tickResolutionEvent) {
      const tickSeed = `${seed}-tick-${entry.data.tick}-${idx}`;
      return {
        text: synthesizeTickNarrative(entry.data.tickResolutionEvent, tickSeed),
        id: `${result.boutId}-${entry.data.tick}`
      };
    }
    // Fallback for other phases or legacy entries
    return {
      text: entry.description || '',
      id: `${result.boutId}-${entry.phase}`
    };
  }).filter(l => l.text);
  
  if (result.isKinboshi) {
    pbpLines.push({
      text: VOCABULARY.ZABUTON_RAIN as string,
      id: `${result.boutId}-kinboshi`
    });
  }

  result.pbpLines = pbpLines;
  result.pbp = pbpLines.map((l) => l.text);
  result.narrative = bashoName ? generateNarrative(east, west, result, bashoName, day) : [];
}

export function synthesizeTickNarrative(event: TickResolutionEvent, tickSeed?: string): string {
    const { action, context } = event;
    const rng = tickSeed ? rngFromSeed(tickSeed, "pbp", "tick") : { next: () => Math.random() };

    const pick = <T>(arr: T[]): T => arr[Math.floor(rng.next() * arr.length)];

    // 1. Select the correct template bucket based on the action family
    let templateBucket = SENTENCE_TEMPLATES[`${action.family}_success`] || SENTENCE_TEMPLATES['push_success'];
    
    // 2. Memory Override: If the action is repeated, use a specific memory template
    if (context.isRepeatedAction) {
        templateBucket = SENTENCE_TEMPLATES['repeated_action'];
    }

    // 3. Pick a random template from the valid bucket
    const rawString = pick(templateBucket);

    // 4. Token Resolution Pass (The Gen-AI style compilation)
    return resolveTokens(rawString, event, tickSeed);
}

function resolveTokens(template: string, event: TickResolutionEvent, tickSeed?: string): string {
    const rng = tickSeed ? rngFromSeed(tickSeed, "pbp", "tokens") : { next: () => Math.random() };
    const pick = <T>(arr: T[]): T => arr[Math.floor(rng.next() * arr.length)];

    // Replace [Attacker] with Shikona
    let output = template.replace(/\[Attacker\]/g, event.attacker.shikona);
    output = output.replace(/\[Defender\]/g, event.defender.shikona);
    
    // Replace Adverbs based on Archetype/Stats
    if (template.includes('[adverbs_heavy]')) {
        output = output.replace(/\[adverbs_heavy\]/g, pick(VOCABULARY.adverbs_heavy));
    }
    if (template.includes('[adverbs_fast]')) {
        output = output.replace(/\[adverbs_fast\]/g, pick(VOCABULARY.adverbs_fast));
    }
    if (template.includes('[adverbs_technical]')) {
        output = output.replace(/\[adverbs_technical\]/g, pick(VOCABULARY.adverbs_technical));
    }

    // Replace Verbs based on family
    const family = event.action.family;
    const verbToken = `[verbs_${family}]`;
    if (template.includes(verbToken)) {
        const verbList = VOCABULARY[`verbs_${family}` as keyof typeof VOCABULARY] as string[];
        if (verbList) {
            output = output.replace(new RegExp(`\\[verbs_${family}\\]`, 'g'), pick(verbList));
        }
    }

    // Action name for repeated templates
    if (template.includes('[action_name]')) {
        output = output.replace(/\[action_name\]/g, event.action.family + " attack");
    }
    
    // Conditional Decorators: Only render if context allows
    if (template.includes('[decorator_exhausted?]')) {
        const replacement = event.context.attackerFatigueLevel === 'exhausted' 
            ? `, ${pick(VOCABULARY.decorator_exhausted)},` 
            : ''; // Render nothing if not exhausted
        output = output.replace(/\[decorator_exhausted\?\]/g, replacement);
    }

    if (template.includes('[decorator_wobbling]')) {
        output = output.replace(/\[decorator_wobbling\]/g, pick(VOCABULARY.decorator_wobbling));
    }
    
    // Clean up double spaces or bad punctuation from empty conditionals
    return output.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
}
