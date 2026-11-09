import { createDigitValidator } from './validator.js';
export const isValidGuess = (guess, length, base) => {
    if (!Number.isInteger(base) ||
        base < 2 ||
        base > 16 ||
        !Number.isInteger(length) ||
        length < 1 ||
        length > base)
        return false;
    const digits = [...guess.toLowerCase()];
    return (digits.length === length &&
        digits.every(createDigitValidator(base)) &&
        new Set(digits).size === length);
};
