/**
 * Check if a number is red in roulette
 * @param {number} number - The number to check
 * @returns {boolean} - True if the number is red
 */
export const isRed = (number) => {
  if (number === 0) return false;
  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  return redNumbers.includes(number);
};

/**
 * Get the background class for a number based on its properties
 * @param {number} number - The roulette number
 * @returns {string} - CSS class name for the background
 */
export const getNumberBackgroundClass = (number) => {
  if (number === 0) return "bg-green-500";
  return isRed(number) ? "bg-red-500" : "bg-black";
};
