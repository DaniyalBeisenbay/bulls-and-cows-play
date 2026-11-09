export const DIGITS = '0123456789abcdef';
export const assertBase = (base) => {
    if (!Number.isInteger(base) || base < 2 || base > DIGITS.length) {
        throw new RangeError('Base must be an integer from 2 to 16');
    }
};
export const createDigitValidator = (base) => {
    assertBase(base);
    const alphabet = DIGITS.slice(0, base);
    return (char) => char.length === 1 && alphabet.includes(char.toLowerCase());
};
