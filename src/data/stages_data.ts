export interface StageInfo {
    id: number;
    difficulty: string;
    introduction: string;
}

export interface IslandInfo {
    id: number;
    name: string;
    stages: StageInfo[];
}

export const CHALLENGE_STAGE_MAP: Record<number, number> = {
    85: 73,
    86: 74,
    87: 75,
    88: 76,
    89: 77,
    90: 78,
    91: 79,
    92: 80,
    93: 81,
    94: 83
};

export function getBaseStageId(stageId: number): number {
    return CHALLENGE_STAGE_MAP[stageId] ?? stageId;
}

export const ISLANDS: IslandInfo[] = [
    {
        "id": 0,
        "name": "Tiki Island",
        "stages": [
            {
                "id": 1,
                "difficulty": "Tutorial",
                "introduction": "Learn how to play."
            },
            {
                "id": 2,
                "difficulty": "Medium 6",
                "introduction": "Heart."
            },
            {
                "id": 3,
                "difficulty": "Hard 1",
                "introduction": "So many monsters."
            },
            {
                "id": 4,
                "difficulty": "Medium 2",
                "introduction": "Smile."
            },
            {
                "id": 5,
                "difficulty": "Medium 1",
                "introduction": "Short cut."
            },
            {
                "id": 6,
                "difficulty": "Easy 2",
                "introduction": "Power play."
            },
            {
                "id": 7,
                "difficulty": "Medium 7",
                "introduction": "Roundabout."
            },
            {
                "id": 8,
                "difficulty": "Medium 5",
                "introduction": "Monster mishmash."
            },
            {
                "id": 9,
                "difficulty": "Medium 4",
                "introduction": "Treeless forest."
            },
            {
                "id": 10,
                "difficulty": "Easy 4",
                "introduction": "Hold the line."
            },
            {
                "id": 11,
                "difficulty": "Easy 1",
                "introduction": "The waves begin."
            },
            {
                "id": 12,
                "difficulty": "Medium 3",
                "introduction": "Bridge out!"
            },
            {
                "id": 13,
                "difficulty": "Hard 2",
                "introduction": "Double team."
            },
            {
                "id": 14,
                "difficulty": "Hard 3",
                "introduction": "Pond patrol."
            },
            {
                "id": 15,
                "difficulty": "Easy 3",
                "introduction": "Prudence is key."
            },
            {
                "id": 16,
                "difficulty": "Hard 5",
                "introduction": "Semicircle assaults."
            },
            {
                "id": 17,
                "difficulty": "Special 1",
                "introduction": "From all sides."
            },
            {
                "id": 18,
                "difficulty": "Hard 6",
                "introduction": "The Final Stage."
            },
            {
                "id": 19,
                "difficulty": "Hard 4",
                "introduction": "Swirling paths."
            },
            {
                "id": 20,
                "difficulty": "Special 2",
                "introduction": "Lines of attack."
            },
            {
                "id": 21,
                "difficulty": "Special 3",
                "introduction": "Eruption Destruction."
            }
        ]
    },
    {
        "id": 1,
        "name": "Toki Island",
        "stages": [
            {
                "id": 43,
                "difficulty": "Hard 1",
                "introduction": "Snake Pit."
            },
            {
                "id": 44,
                "difficulty": "Medium 1",
                "introduction": "Splash Damage."
            },
            {
                "id": 45,
                "difficulty": "Medium 2",
                "introduction": "Amidargh!"
            },
            {
                "id": 46,
                "difficulty": "Easy 3",
                "introduction": "Paku-Paku."
            },
            {
                "id": 47,
                "difficulty": "Special 3",
                "introduction": "Monster Invaders!"
            },
            {
                "id": 48,
                "difficulty": "Special 1",
                "introduction": "Origin."
            },
            {
                "id": 49,
                "difficulty": "Medium 3",
                "introduction": "X Marks the Spot."
            },
            {
                "id": 50,
                "difficulty": "Easy 1",
                "introduction": "Whipped Frenzy."
            },
            {
                "id": 51,
                "difficulty": "Easy 2",
                "introduction": "Zen Loop."
            },
            {
                "id": 52,
                "difficulty": "Hard 2",
                "introduction": "Racer Gardens."
            },
            {
                "id": 53,
                "difficulty": "Easy 4",
                "introduction": "D\u00e9j\u00e0 Vu."
            },
            {
                "id": 54,
                "difficulty": "Hard 3",
                "introduction": "Open Space."
            },
            {
                "id": 55,
                "difficulty": "Special 2",
                "introduction": "Speed Monster."
            },
            {
                "id": 56,
                "difficulty": "Final Stage",
                "introduction": "Boss Clash."
            },
            {
                "id": 57,
                "difficulty": "Medium 4",
                "introduction": "Two Streams."
            }
        ]
    },
    {
        "id": 2,
        "name": "Gati Gati Island",
        "stages": [
            {
                "id": 73,
                "difficulty": "Easy 1",
                "introduction": "Playing in the sand."
            },
            {
                "id": 74,
                "difficulty": "Easy 2",
                "introduction": "Loch Ness Monsters."
            },
            {
                "id": 75,
                "difficulty": "Special 1",
                "introduction": "Air Raid Sirens."
            },
            {
                "id": 76,
                "difficulty": "Easy 3",
                "introduction": "Apocalypse Beach."
            },
            {
                "id": 77,
                "difficulty": "Medium 1",
                "introduction": "It's a TRAP!"
            },
            {
                "id": 78,
                "difficulty": "Medium 2",
                "introduction": "Bridges of Mad County."
            },
            {
                "id": 79,
                "difficulty": "Special 2",
                "introduction": "Gemless Waterfall."
            },
            {
                "id": 80,
                "difficulty": "Hard 1",
                "introduction": "Cave dwellers."
            },
            {
                "id": 81,
                "difficulty": "Hard 2",
                "introduction": "One and Only."
            },
            {
                "id": 82,
                "difficulty": "Special 3",
                "introduction": "Gold rush!"
            },
            {
                "id": 83,
                "difficulty": "Hard 3",
                "introduction": "Volcanic Swirl."
            }
        ]
    },
    {
        "id": 3,
        "name": "Challenges",
        "stages": [
            {
                "id": 11,
                "difficulty": "Green Flag",
                "introduction": "Clear the specified stage without a tower ever upgrading."
            },
            {
                "id": 10,
                "difficulty": "Gem Hoarder",
                "introduction": "Clear the specified stage with 25 or more gems."
            },
            {
                "id": 6,
                "difficulty": "Bomb The Boss",
                "introduction": "Clear the specified stage using only bombs to destroy the boss."
            },
            {
                "id": 12,
                "difficulty": "No Crossing",
                "introduction": "Clear the specified stage without crossing the bridge."
            },
            {
                "id": 9,
                "difficulty": "4 Tree Rainbow",
                "introduction": "Perfect clear the specified stage."
            },
            {
                "id": 2,
                "difficulty": "Get Medieval",
                "introduction": "Clear the specified stage using only arrows and cannons."
            },
            {
                "id": 3,
                "difficulty": "Tower Collector",
                "introduction": "Clear the specified stage building all types of tower."
            },
            {
                "id": 13,
                "difficulty": "Rainbow Team",
                "introduction": "Perfect clear the specified stage."
            },
            {
                "id": 14,
                "difficulty": "Picky Eater",
                "introduction": "Clear the specified stage without using the fire tower."
            },
            {
                "id": 85,
                "difficulty": "Get Medieval 2",
                "introduction": "Clear the specified stage using only arrows and cannons."
            },
            {
                "id": 86,
                "difficulty": "Mutant",
                "introduction": "Clear the specified stage with a super-charged boss."
            },
            {
                "id": 88,
                "difficulty": "Apocalypse Prolapse",
                "introduction": "Clear the specified stage without letting a single balloon enemy touch the ground."
            },
            {
                "id": 87,
                "difficulty": "Scrooge 3",
                "introduction": "Clear the specified stage with a balance of 14,000 worth of coins or more."
            },
            {
                "id": 89,
                "difficulty": "Kill Off!",
                "introduction": "Clear the specified stage while defeating 100 enemies with the trap tower."
            },
            {
                "id": 90,
                "difficulty": "Master Sniper",
                "introduction": "Clear the specified stage while having only one tower on the screen at a time."
            },
            {
                "id": 91,
                "difficulty": "Zero Carat 2",
                "introduction": "Clear the specified stage without using any gems."
            },
            {
                "id": 92,
                "difficulty": "Demolition Duo",
                "introduction": "Clear the specified stage while using only cannon and ice towers."
            },
            {
                "id": 93,
                "difficulty": "Hidden Monument",
                "introduction": "Clear the specified stage while constructing five Gem towers."
            },
            {
                "id": 94,
                "difficulty": "Anti-Enemy Rush",
                "introduction": "Clear the specified stage filled with resistance enemies."
            },
            {
                "id": 50,
                "difficulty": "Black Flag",
                "introduction": "Without selling any towers clear the specified stage with all towers upgraded to black. Gem tower is locked!"
            },
            {
                "id": 50,
                "difficulty": "Scrooge's Return",
                "introduction": "Clear the specified stage with a balance of 12,000 worth of coins or more."
            },
            {
                "id": 53,
                "difficulty": "Scrooge",
                "introduction": "Clear the specified stage with a balance of 10,000 worth of coins or more."
            },
            {
                "id": 44,
                "difficulty": "Wishing Well",
                "introduction": "Drop 100 coins into the water and clear the specified stage."
            },
            {
                "id": 43,
                "difficulty": "Zero Carat",
                "introduction": "Clear the specified stage without using gems."
            }
        ]
    }
];


const difficultyRank: Record<string, number> = {
    "Tutorial": 1,
    "Easy": 2,
    "Medium": 3,
    "Hard": 4,
    "Special": 5,
    "Final Stage": 6
};

function parseDifficulty(diff: string) {
    const match = diff.match(/^([a-zA-Z\s]+?)\s*(\d*)$/);
    if (!match) return { base: diff, num: 0 };
    return {
        base: match[1].trim(),
        num: match[2] ? parseInt(match[2], 10) : 0
    };
}

ISLANDS.forEach(island => {
    if (island.name === "Challenges") return; // Preserve in-game menu order
    island.stages.sort((a, b) => {
        const aParsed = parseDifficulty(a.difficulty);
        const bParsed = parseDifficulty(b.difficulty);
        
        const aRank = difficultyRank[aParsed.base] || 99;
        const bRank = difficultyRank[bParsed.base] || 99;
        
        if (aRank !== bRank) return aRank - bRank;
        return aParsed.num - bParsed.num;
    });
});
