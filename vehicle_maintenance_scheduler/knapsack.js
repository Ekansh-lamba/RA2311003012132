function knapsack(capacity, items) {
  const n = items.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { duration, impact } = items[i - 1];
    for (let w = 0; w <= capacity; w++) {
      dp[i][w] = dp[i - 1][w];
      if (duration <= w && dp[i - 1][w - duration] + impact > dp[i][w]) {
        dp[i][w] = dp[i - 1][w - duration] + impact;
      }
    }
  }

  const selected = [];
  let w = capacity;
  for (let i = n; i >= 1; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      selected.push(items[i - 1]);
      w -= items[i - 1].duration;
    }
  }

  return selected;
}

module.exports = knapsack;
