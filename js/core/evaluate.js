export const evaluateGuess = (secret, guess) => {
    if (secret.length !== guess.length)
        throw new RangeError('Lengths must match');
    const secretDigits = [...secret.toLowerCase()];
    const guessDigits = [...guess.toLowerCase()];
    const bulls = guessDigits.filter((digit, index) => digit === secretDigits[index]).length;
    const frequencies = (digits) => digits.reduce((counts, digit) => ({ ...counts, [digit]: (counts[digit] ?? 0) + 1 }), {});
    const secretCounts = frequencies(secretDigits);
    const guessCounts = frequencies(guessDigits);
    const matches = Object.keys(guessCounts).reduce((total, digit) => total + Math.min(secretCounts[digit] ?? 0, guessCounts[digit]), 0);
    return { bulls, cows: matches - bulls };
};
