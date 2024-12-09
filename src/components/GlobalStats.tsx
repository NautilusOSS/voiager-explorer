import React, { useEffect } from "react";
import { SimpleGrid } from "@chakra-ui/react";
import AverageBlockTime from "./AverageBlockTime";
import LatestBlockStat from "./LatestBlockStat";
import SupplyStat from "./SupplyStat";
import { useGlobalStats } from "../context/GlobalStatsContext";
import { getSupplyInfo } from "../services/supply";

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;
let lastFetchTime = 0;

const GlobalStats: React.FC = () => {
  const { state, dispatch } = useGlobalStats();

  useEffect(() => {
    const fetchSupplyInfo = async () => {
      const now = Date.now();
      
      // Only fetch if cache has expired
      if (now - lastFetchTime >= CACHE_DURATION) {
        try {
          const supplyData = await getSupplyInfo();
          dispatch({
            type: 'UPDATE_SUPPLY',
            payload: {
              ...supplyData,
              totalBlocksAnalyzed: state.totalBlocksAnalyzed,
              newDiffs: [],
              latestBlock: state.latestBlock,
            }
          });
          lastFetchTime = now;
        } catch (error) {
          console.error('Error fetching supply info:', error);
        }
      }
    };

    fetchSupplyInfo();
    // Still set up an interval, but it will only fetch if the cache has expired
    const interval = setInterval(fetchSupplyInfo, 60000);
    return () => clearInterval(interval);
  }, [dispatch, state.totalBlocksAnalyzed, state.latestBlock]);

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      <LatestBlockStat latestBlock={state.latestBlock} />
      <AverageBlockTime
        averageBlockTime={state.averageBlockTime}
        totalBlocksAnalyzed={state.totalBlocksAnalyzed}
      />
      <SupplyStat circulatingSupply={state.circulatingSupply} />
    </SimpleGrid>
  );
};

export default GlobalStats;
