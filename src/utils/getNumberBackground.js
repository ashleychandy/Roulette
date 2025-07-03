// Get background color class based on number
const getNumberBackgroundClass = useCallback((number) => {
  if (number === null || number === undefined) {
    return "bg-white border-gray-200";
  }
  const num = Number(number);
  if (num === 0) {
    return "bg-gradient-to-br from-[#22AD74]/90 to-[#22AD74]/70 border-[#22AD74]/20 text-white";
  }
  if (isRed(num)) {
    return "bg-gradient-to-br from-gaming-primary/90 to-gaming-accent/90 border-gaming-primary/20 text-white";
  }
  return "bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-gray-700/20 text-white";
}, []);
