export const DIFFICULTY_LEVELS = ["Casual", "Regular", "Hardcore"];

export const DIFFICULTY_DATA: Record<string, { boss: number[], multiply: number[], count: number[] }> = {
    "Tiki Island": { boss: [0.85, 1.00, 1.10], multiply: [0.90, 1.00, 1.35], count: [0.75, 1.00, 0.80] },
    "Toki Island": { boss: [0.75, 1.00, 1.05], multiply: [0.90, 1.00, 1.20], count: [0.75, 1.00, 0.85] },
    "Gati Gati Island": { boss: [0.85, 1.00, 1.10], multiply: [0.90, 1.00, 1.35], count: [0.75, 1.00, 0.80] },
    "Challenges": { boss: [0.85, 1.00, 1.10], multiply: [0.90, 1.00, 1.35], count: [0.75, 1.00, 0.80] }
};
