import { assertBase } from './validator.js';
const memoize = (calculate) => {
    const cache = new Map();
    return (length, base) => {
        const key = `${length}:${base}`;
        const cached = cache.get(key);
        if (cached !== undefined)
            return cached;
        const result = calculate(length, base);
        cache.set(key, result);
        return result;
    };
};
const permutations = memoize((length, base) => length === 0 ? 1 : base * permutations(length - 1, base - 1));
export const countPossibleSecrets = (length, base) => {
    assertBase(base);
    if (!Number.isInteger(length) || length < 0 || length > base)
        throw new RangeError('Invalid secret length');
    return permutations(length, base);
};
