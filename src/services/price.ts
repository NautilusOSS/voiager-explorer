interface PoolResponse {
  pools: Array<{
    poolBalA: string; // aUSDC balance
    poolBalB: string; // VOI balance
    symbolA: string;
    symbolB: string;
  }>;
}

interface PricesResponse {
  prices: Array<{
    poolId: string;
    contractId: number;
    symbolA: string;
    symbolB: string;
    poolBalA: string;
    poolBalB: string;
    price: number;
  }>;
}

export const getVoiPrice = async (): Promise<{
  voi: { usd: number; usd_24h_change: number | null }
}> => {
  try {
    const response = await fetch(
      "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?contractId=395553&includes=all"
    );
    const data: PoolResponse = await response.json();

    const pool = data.pools[0];
    if (!pool) throw new Error("No pool data found");

    // Calculate price: aUSDC/VOI
    const poolBalA = parseFloat(pool.poolBalA); // aUSDC amount
    const poolBalB = parseFloat(pool.poolBalB); // VOI amount
    const price = poolBalA / poolBalB;

    return {
      voi: {
        usd: price,
        usd_24h_change: null
      }
    };
  } catch (error) {
    console.error("Error fetching VOI price:", error);
    throw error;
  }
};

export const getPrices = async (): Promise<{
  prices: Array<{
    symbolA: string;
    symbolB: string;
    price: number;
  }>;
}> => {
  try {
    const response = await fetch(
      "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"
    );
    const data: PricesResponse = await response.json();

    return {
      prices: data.prices.map(({ symbolA, symbolB, price }) => ({
        symbolA,
        symbolB,
        price,
      }))
    };
  } catch (error) {
    console.error("Error fetching prices:", error);
    throw error;
  }
};
