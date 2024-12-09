interface PoolResponse {
  pools: Array<{
    poolBalA: string; // aUSDC balance
    poolBalB: string; // VOI balance
    symbolA: string;
    symbolB: string;
  }>;
}

export const getVoiPrice = async (): Promise<{
  voi: { usd: number };
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
      },
    };
  } catch (error) {
    console.error("Error fetching VOI price:", error);
    throw error;
  }
};
