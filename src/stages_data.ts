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
        "name": "TucTuc Island",
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
    island.stages.sort((a, b) => {
        const aParsed = parseDifficulty(a.difficulty);
        const bParsed = parseDifficulty(b.difficulty);
        
        const aRank = difficultyRank[aParsed.base] || 99;
        const bRank = difficultyRank[bParsed.base] || 99;
        
        if (aRank !== bRank) return aRank - bRank;
        return aParsed.num - bParsed.num;
    });
});
