import { BetTypes } from "../constants/roulette_constants";

/**
 * Validates if a number is within the valid range (0-36)
 * @param {number} number - The number to validate
 * @returns {boolean} Whether the number is valid
 */
const isValidNumber = (number) => {
  return Number.isInteger(number) && number >= 0 && number <= 36;
};

/**
 * Validates a dozen bet
 * @param {number[]} numbers - Array of numbers in the bet
 * @returns {boolean} Whether the dozen bet is valid
 */
export const isValidDozen = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length !== 12) return false;

  // Check if all numbers are valid and in sequence
  const start = numbers[0];
  if (!isValidNumber(start) || start % 12 !== 1) return false;

  for (let i = 1; i < 12; i++) {
    if (numbers[i] !== start + i) return false;
  }

  return true;
};

/**
 * Validates a column bet
 * @param {number[]} numbers - Array of numbers in the bet
 * @returns {boolean} Whether the column bet is valid
 */
export const isValidColumn = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length !== 12) return false;

  // Check if all numbers follow column pattern (n, n+3, n+6, ...)
  const start = numbers[0];
  if (!isValidNumber(start) || start > 3) return false;

  for (let i = 1; i < 12; i++) {
    if (numbers[i] !== start + i * 3) return false;
  }

  return true;
};

/**
 * Validates a straight (single number) bet
 * @param {number[]} numbers - Array containing single number
 * @returns {boolean} Whether the straight bet is valid
 */
export const isValidStraight = (numbers) => {
  return (
    Array.isArray(numbers) && numbers.length === 1 && isValidNumber(numbers[0])
  );
};

/**
 * Validates if numbers are all red
 * @param {number[]} numbers - Array of numbers to check
 * @returns {boolean} Whether all numbers are red
 */
export const isValidRed = (numbers) => {
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  return numbers.every((num) => redNumbers.includes(num));
};

/**
 * Validates if numbers are all black
 * @param {number[]} numbers - Array of numbers to check
 * @returns {boolean} Whether all numbers are black
 */
export const isValidBlack = (numbers) => {
  const blackNumbers = [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ];
  return numbers.every((num) => blackNumbers.includes(num));
};

/**
 * Main bet validation function
 * @param {number[]} numbers - Array of numbers in the bet
 * @param {number} betType - Type of bet from BetTypes enum
 * @returns {boolean} Whether the bet is valid
 */
export const isValidBet = (numbers, betType) => {
  if (!Array.isArray(numbers) || numbers.length === 0) return false;

  switch (betType) {
    case BetTypes.STRAIGHT:
      return isValidStraight(numbers);

    case BetTypes.DOZEN_FIRST:
    case BetTypes.DOZEN_SECOND:
    case BetTypes.DOZEN_THIRD:
      return isValidDozen(numbers);

    case BetTypes.COLUMN_FIRST:
    case BetTypes.COLUMN_SECOND:
    case BetTypes.COLUMN_THIRD:
      return isValidColumn(numbers);

    case BetTypes.RED:
      return isValidRed(numbers);

    case BetTypes.BLACK:
      return isValidBlack(numbers);

    case BetTypes.EVEN:
      return numbers.every((num) => num % 2 === 0);

    case BetTypes.ODD:
      return numbers.every((num) => num % 2 === 1);

    case BetTypes.LOW:
      return numbers.every((num) => num >= 1 && num <= 18);

    case BetTypes.HIGH:
      return numbers.every((num) => num >= 19 && num <= 36);

    default:
      return false;
  }
};
