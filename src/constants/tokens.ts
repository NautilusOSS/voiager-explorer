export interface TokenConfig {
  excludedAddresses?: string[];
  distributionAmount?: {
    amount: number;
    decimals: number;
    symbol: string;
  };
}

export const TOKEN_CONFIGS: { [key: string]: TokenConfig } = {
  '410111': {
    excludedAddresses: [
      "HV5XXORL42ABSMTUVPFJTF4SEPRSSYKAUU3KNI6IIXIZVV77EBB2MBCOKI"
    ],
    distributionAmount: {
      amount: 100000,
      decimals: 6,
      symbol: 'VOI'
    }
  }
};

export const HOLDERS_PER_PAGE = 100;

// Helper function to get formatted distribution amount
export const getFormattedDistributionAmount = (tokenId: string): string | null => {
  const config = TOKEN_CONFIGS[tokenId];
  if (!config?.distributionAmount) return null;

  const { amount, decimals, symbol } = config.distributionAmount;
  const formatted = (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: decimals
  });
  return `${formatted} ${symbol}`;
}; 