import re

with open('src/engine/narrative.ts', 'r') as f:
    content = f.read()

# 1. generateRitualElements
content = re.sub(
    r'(\s*)\]\s*:\s*\[`\$\{east\.shikona\} takes his salt\.`, `\$\{east\.shikona\} tosses the salt—a simple gesture\.`\];',
    r'\1],\n        [\n          `${east.shikona} takes his salt.`,\n          `${east.shikona} tosses the salt—a simple gesture.`,\n          `${east.shikona} scoops a modest handful of salt, casting it low over the clay.`,\n          `${east.shikona} flicks the purifying salt with practiced economy.`\n        ];',
    content
)

content = re.sub(
    r'(\s*)\]\s*:\s*\[`\$\{west\.shikona\} follows suit\.`, `\$\{west\.shikona\} takes his turn\.`\];',
    r'\1],\n        [\n          `${west.shikona} follows suit.`,\n          `${west.shikona} takes his turn.`,\n          `${west.shikona} answers the ritual with a sharp, no-nonsense throw.`,\n          `${west.shikona} steps forward, salt flying in a tight arc.`\n        ];',
    content
)

content = content.replace(
    '''        "The tension is palpable. The crowd's low murmur drops to silence.",''',
    '''        "The tension is palpable. The crowd's low murmur drops to silence.",
        "The air inside the Kokugikan is thick with barely-contained violence.",
        "A primal standoff at the center of the ring. Neither man blinks.",
        "The psychological war hits a crescendo—the stare-down is absolute.",
        "Two mountains of flesh and pride, locked in a death stare.",'''
)

content = content.replace(
    '''        "The gyoji raises the gunbai. The final moments of peace."
      ], () => rng.next())''',
    '''        "The gyoji raises the gunbai. The final moments of peace.",
        "They drop their hips, knuckles hovering over the sacred sand.",
        "The final wipe of the towel. It's time for war.",
        "A sharp inhale from both warriors. The fuse is lit.",
        "They sink into the shikiri—pure, coiled aggression waiting to be unleashed."
      ], () => rng.next())'''
)

# 2. generateTachiai
content = content.replace(
    '''          `${winnerName} takes complete control at the line! The power is absolute!`
        ], () => rng.next())''',
    '''          `${winnerName} takes complete control at the line! The power is absolute!`,
          `A monstrous hit! ${winnerName} detonates at the tachi-ai!`,
          `${winnerName} drives his head into the chest like a battering ram!`,
          `Pure kinetic destruction! ${winnerName} owns the initial collision!`,
          `The hall echoes with the sickening crack of flesh on flesh! ${winnerName} dominates!`,
          `${winnerName} launches like a missile, instantly overwhelming the center!`
        ], () => rng.next())'''
)

content = content.replace(
    '''          `It's all ${loserName} can do to stay upright!`
        ], () => rng.next())''',
    '''          `It's all ${loserName} can do to stay upright!`,
          `${loserName} is nearly folded in half by the brutal impact!`,
          `His root is shattered instantly! ${loserName} scrambles backward!`,
          `A desperate retreat from ${loserName} as he absorbs the furious charge!`,
          `${loserName}'s chin flies up—his posture broken in a split second!`,
          `The wind is knocked right out of ${loserName}! A disastrous start!`
        ], () => rng.next())'''
)

# 3. generateClinch
content = content.replace(
    '''            "They bind together like ancient oaks. A profound struggle for leverage!"
          ], () => rng.next())''',
    '''            "They bind together like ancient oaks. A profound struggle for leverage!",
            "A grueling test of isometric strength—veins popping, chests heaving!",
            "Deep morozashi! The double-inside grip spells doom if he can't break it!",
            "They sink their hips low, seeking the perfect angle on the mawashi!",
            "A ferocious battle for the inside track! Both men wrenching the heavy canvas!",
            "Grips locked tight! The physics of the dohyo demand absolute perfection here!"
          ], () => rng.next())'''
)

# 4. generateMomentum
content = content.replace(
    '''          `He survives by a hair's breadth! ${trailingName} is still in this!`
        ], () => rng.next())''',
    '''          `He survives by a hair's breadth! ${trailingName} is still in this!`,
          `${trailingName} plants a heel on the tawara—a masterclass in edge defense!`,
          `Incredible core strength! ${trailingName} arches backward but holds the line!`,
          `He slips the nodowa! ${trailingName} ducks under the thrust and resets!`,
          `A desperate sidestep! ${trailingName} barely avoids going over the bales!`,
          `He parries the massive thrust, throwing the momentum off-center!`
        ], () => rng.next())'''
)

content = content.replace(
    '''          `${likelyLeader} tightens the grip and cranks the pressure high!`
        ], () => rng.next())''',
    '''          `${likelyLeader} tightens the grip and cranks the pressure high!`,
          `${likelyLeader} unleashes a devastating harite—a sharp slap to the face!`,
          `A brutal nodowa to the throat! ${likelyLeader} stands his man straight up!`,
          `Relentless tsuppari! Machine-gun thrusts from ${likelyLeader}!`,
          `${likelyLeader} pulls him forward with a violent hazuoshi to the armpits!`,
          `He shifts the grip, cutting off the blood flow—${likelyLeader} is squeezing the life out of him!`
        ], () => rng.next())'''
)

# 5. generateTurningPoint
content = content.replace(
    '''        `The resistance shatters! ${winnerName} executes the final sequence!`
      ], () => rng.next())''',
    '''        `The resistance shatters! ${winnerName} executes the final sequence!`,
        `A violent yank on the mawashi! ${winnerName} destroys his opponent's center of gravity!`,
        `${winnerName} drops his hips and explodes upward! The torque is immense!`,
        `The opening he needed! ${winnerName} steps in deep and commits his entire weight!`,
        `${loserName} bites on the feint! ${winnerName} ruthlessly punishes the mistake!`,
        `A colossal surge of power from ${winnerName} breaks the stalemate wide open!`
      ], () => rng.next())'''
)

# 6. generateClosing
content = content.replace(
    '''        `A stunning display of sumo! The audience is left buzzing in its wake.`
      ], () => rng.next())''',
    '''        `A stunning display of sumo! The audience is left buzzing in its wake.`,
        `${winner.shikona} offers no emotion—just the cold stare of a predator who has fed.`,
        `Medical staff briefly check on ${loser.shikona} as ${winner.shikona} bows. A savage encounter.`,
        `${winner.shikona} adjusts his mawashi, chest violently rising and falling in the aftermath.`,
        `The sheer brutality of the sport on full display. What a monumental finish for ${winner.shikona}.`,
        `${loser.shikona} shakes his head in bitter disappointment, while ${winner.shikona} accepts the water of strength.`
      ], () => rng.next())'''
)

with open('src/engine/narrative.ts', 'w') as f:
    f.write(content)
