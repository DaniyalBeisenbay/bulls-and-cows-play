import { evaluateGuess } from './evaluate.js';
import { isValidGuess } from './guess.js';
export const validSettings = ({ length, base }) => [2, 8, 10, 16].includes(base) &&
    Number.isInteger(length) &&
    length >= 2 &&
    length <= 6 &&
    length <= base;
export const createGame = (settings, secret, startedAt) => {
    if (!validSettings(settings) ||
        !isValidGuess(secret, settings.length, settings.base))
        throw new RangeError('Invalid round');
    return {
        settings: { ...settings },
        secret: secret.toLowerCase(),
        startedAt,
        elapsedMs: 0,
        status: 'playing',
        history: [],
    };
};
export const submitGuess = (game, guess, now) => {
    const normalized = guess.toLowerCase();
    if (game.status !== 'playing' ||
        !isValidGuess(normalized, game.settings.length, game.settings.base) ||
        game.history.some((entry) => entry.guess === normalized))
        return game;
    const result = evaluateGuess(game.secret, normalized);
    return {
        ...game,
        history: [...game.history, { guess: normalized, ...result }],
        status: result.bulls === game.settings.length ? 'won' : 'playing',
        elapsedMs: Math.max(0, now - game.startedAt),
    };
};
export const addRecord = (records, record, limit = 10) => [...records, { ...record }]
    .sort((a, b) => a.attempts - b.attempts || a.elapsedMs - b.elapsedMs)
    .slice(0, Math.max(0, limit));
const isRecord = (value) => {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return (validSettings(record) &&
        Number.isInteger(record.attempts) &&
        record.attempts > 0 &&
        Number.isFinite(record.elapsedMs) &&
        record.elapsedMs >= 0 &&
        typeof record.date === 'string' &&
        Number.isFinite(Date.parse(record.date)));
};
export const parseRecords = (raw) => {
    try {
        const parsed = JSON.parse(raw ?? '[]');
        return Array.isArray(parsed)
            ? parsed
                .filter(isRecord)
                .sort((a, b) => a.attempts - b.attempts || a.elapsedMs - b.elapsedMs)
                .slice(0, 10)
            : [];
    }
    catch {
        return [];
    }
};
