const handleUndoBet = useCallback(() => {
  setSelectedBets((prev) => {
    const newBets = [...prev];
    newBets.pop(); // Remove the last bet

    // Update total bet amount
    const newTotalAmount = newBets.reduce(
      (sum, bet) => sum + BigInt(bet.amount),
      BigInt(0),
    );
    setTotalBetAmount(newTotalAmount);

    return newBets;
  });
}, []);
