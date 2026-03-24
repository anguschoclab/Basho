import re

with open('src/engine/media.ts', 'r') as f:
    content = f.read()

# 1. createWeeklyFeatureHeadline
content = content.replace(
    '''      ? `${r.shikona} Draws Eyes This Week`
      : `Spotlight on ${r.shikona}`;''',
    '''      ? `${r.shikona} Draws Eyes This Week`
      : rng.next() < 0.5 ? `Spotlight on ${r.shikona}` : `${r.shikona}'s Sizzling Form Cannot Be Ignored`;'''
)
content = content.replace(
    '''      ? "Momentum is building — and the crowd is noticing."
      : "The story behind the rise, told through keiko and grit.";''',
    '''      ? "Momentum is building — and the crowd is noticing."
      : rng.next() < 0.5 ? "The story behind the rise, told through keiko and grit." : "The media circus circles the dohyo as the new rising star emerges.";'''
)

# 2. buildBoutHeadlineTitle
content = content.replace(
    '''      `${l} Falls — ${w} Seizes the Moment`
    ];''',
    '''      `${l} Falls — ${w} Seizes the Moment`,
      `${w} Derails ${l}'s Basho Ambitions`,
      `Massive Upset! ${w} Topples ${l}`
    ];'''
)

content = content.replace(
    '''    `${w} Overcomes ${l}`,
    `${w} Turns Back ${l}`
  ];''',
    '''    `${w} Overcomes ${l}`,
    `${w} Turns Back ${l}`,
    `${w} Proves Too Strong for ${l}`,
    `Textbook Sumo: ${w} Dispatches ${l}`
  ];'''
)

# 3. buildBoutHeadlineSubtitle
content = content.replace(
    '''      "A result that won’t be forgotten soon."
    ];''',
    '''      "A result that won’t be forgotten soon.",
      "The Kokugikan roof nearly blew off after that finish.",
      "Is this a fluke, or the beginning of a true crisis?"
    ];'''
)

# 4. updateStreakAndGenerateHeadline
content = content.replace(
    '''    : [`${r.shikona} Extends Win Streak to ${streak}`, `Hot Streak: ${r.shikona} Now ${streak}-0`];''',
    '''    : [`${r.shikona} Extends Win Streak to ${streak}`, `Hot Streak: ${r.shikona} Now ${streak}-0`, `${streak} Wins! ${r.shikona} Keeps Rolling`];'''
)

# 5. checkPromotionWatch
content = content.replace(
    '''      title: rng.next() < 0.5
        ? `${winner.shikona} Fights to Survive in Juryo — ${wins}-${losses}`
        : `Demotion Looms for ${winner.shikona}`,
      subtitle: "Every remaining bout is do-or-die at the bottom of the paid ranks.",''',
    '''      title: rng.next() < 0.5
        ? `${winner.shikona} Fights to Survive in Juryo — ${wins}-${losses}`
        : `Demotion Looms for ${winner.shikona}`,
      subtitle: rng.next() < 0.5 ? "Every remaining bout is do-or-die at the bottom of the paid ranks." : "A devastating fall to Makushita edges closer.",'''
)

# 6. generateInjuryWithdrawalHeadline
content = content.replace(
    '''    : [
        `${shikona} Pulls Out After ${capitalize(area)} Concern`,
        `${shikona} Withdraws — Minor Injury Cited`,
      ];''',
    '''    : [
        `${shikona} Pulls Out After ${capitalize(area)} Concern`,
        `${shikona} Withdraws — Minor Injury Cited`,
        `JSA confirms ${shikona}'s Kyujo status over ${capitalize(area)}.`
      ];'''
)

content = content.replace(
    '''    ? `The ${rank} could not continue after ${description.toLowerCase()}`
    : `A precautionary withdrawal. The stable hopes for a quick recovery.`;''',
    '''    ? `The ${rank} could not continue after ${description.toLowerCase()}`
    : `A precautionary withdrawal. The stable hopes for a quick recovery or faces questions later.`;'''
)

# 7. generateScandalHeadline
content = content.replace(
    '''          `Disgrace: ${heya.name} Faces Expulsion Threats`,
          `Late-Night Roppongi Incident Haunts ${heya.name}`
        ]''',
    '''          `Disgrace: ${heya.name} Faces Expulsion Threats`,
          `Late-Night Roppongi Incident Haunts ${heya.name}`,
          `Unthinkable Conduct! The Fall of ${heya.name}`
        ]'''
)
content = content.replace(
    '''          `Kyodo News: Internal Friction Plagues ${heya.name}`,
          `Tabloids Feast on ${heya.name}'s Woes`
        ]''',
    '''          `Kyodo News: Internal Friction Plagues ${heya.name}`,
          `Tabloids Feast on ${heya.name}'s Woes`,
          `Secret Training Incidents at ${heya.name} Leaked`
        ]'''
)

# 8. generateGovernanceHeadline
content = content.replace(
    '''      `Financial Ruin Prompts JSA Ultimatum for ${heya.name}`
    ];''',
    '''      `Financial Ruin Prompts JSA Ultimatum for ${heya.name}`,
      `A Disgrace to Tradition: ${heya.name} Nears Bankruptcy`
    ];'''
)
content = content.replace(
    '''      `Dietary and Medical Neglect Investigated at ${heya.name}`
    ];''',
    '''      `Dietary and Medical Neglect Investigated at ${heya.name}`,
      `Cruel Keiko Methods Exposed at ${heya.name}`
    ];'''
)

# 9. checkRetirementWatch
content = content.replace(
    '''        `Retirement Watch: ${shikona} Faces Another Tough Basho`,
      ];''',
    '''        `Retirement Watch: ${shikona} Faces Another Tough Basho`,
        `End of the Road? ${shikona}'s Final Stand Approaches`
      ];'''
)


with open('src/engine/media.ts', 'w') as f:
    f.write(content)
