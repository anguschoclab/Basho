import { VOCABULARY, SENTENCE_TEMPLATES } from './grammarDefinitions';
import { TickResolutionEvent } from '../types/combat';
import { generateNarrative } from "../narrative";
import type { Rikishi } from "../types/rikishi";
import type { BoutResult, BashoName } from "../types/basho";

/**
 * Pure translator function. Consumes raw physics frames and maps them 
 * to event tokens defined in pbpMatrix/pbp.ts, and generates narrative.
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
  const pbpLines = result.log.map(entry => {
    if (entry.phase === 'engagement' && entry.data?.tickResolutionEvent) {
      return {
        text: synthesizeTickNarrative(entry.data.tickResolutionEvent),
        id: `${result.boutId}-${entry.data.tick}`
      };
    }
    // Fallback for other phases or legacy entries
    return {
      text: entry.description || '',
      id: `${result.boutId}-${entry.phase}`
    };
  }).filter(l => l.text);

  result.pbpLines = pbpLines;
  result.pbp = pbpLines.map((l) => l.text);
  result.narrative = bashoName ? generateNarrative(east, west, result, bashoName, day) : [];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function synthesizeTickNarrative(event: TickResolutionEvent): string {
    const { action, context } = event;

    // 1. Select the correct template bucket based on the action family
    let templateBucket = SENTENCE_TEMPLATES[`${action.family}_success`] || SENTENCE_TEMPLATES['push_success'];
    
    // 2. Memory Override: If the action is repeated, use a specific memory template
    if (context.isRepeatedAction) {
        templateBucket = SENTENCE_TEMPLATES['repeated_action'];
    }

    // 3. Pick a random template from the valid bucket
    const rawString = pickRandom(templateBucket);

    // 4. Token Resolution Pass (The Gen-AI style compilation)
    return resolveTokens(rawString, event);
}

function resolveTokens(template: string, event: TickResolutionEvent): string {
    // Replace [Attacker] with Shikona
    let output = template.replace(/\[Attacker\]/g, event.attacker.shikona);
    output = output.replace(/\[Defender\]/g, event.defender.shikona);
    
    // Replace action_name
    output = output.replace(/\[action_name\]/g, event.action.family);

    // Replace Adverbs based on Archetype/Stats
    if (template.includes('[adverbs_heavy]')) {
        output = output.replace(/\[adverbs_heavy\]/g, pickRandom(VOCABULARY.adverbs_heavy));
    }
    if (template.includes('[adverbs_fast]')) {
        output = output.replace(/\[adverbs_fast\]/g, pickRandom(VOCABULARY.adverbs_fast));
    }
    
    // Verbs
    if (template.includes('[verbs_push]')) {
        output = output.replace(/\[verbs_push\]/g, pickRandom(VOCABULARY.verbs_push));
    }
    if (template.includes('[verbs_trick]')) {
        output = output.replace(/\[verbs_trick\]/g, pickRandom(VOCABULARY.verbs_trick));
    }

    // Decorators
    if (template.includes('[decorator_wobbling]')) {
        output = output.replace(/\[decorator_wobbling\]/g, pickRandom(VOCABULARY.decorator_wobbling));
    }

    // Conditional Decorators: Only render if context allows
    if (template.includes('[decorator_exhausted?]')) {
        const replacement = event.context.attackerFatigueLevel === 'exhausted' 
            ? `, ${pickRandom(VOCABULARY.decorator_exhausted)},` 
            : ''; // Render nothing if not exhausted
        output = output.replace(/\[decorator_exhausted\?\]/g, replacement);
    }
    
    // Clean up double spaces or bad punctuation from empty conditionals
    return output.replace(/\s+/g, ' ').replace(/ ,/g, ',');
}
