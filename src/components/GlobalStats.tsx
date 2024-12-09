import React, { useEffect } from "react";
import { SimpleGrid } from "@chakra-ui/react";
import AverageBlockTime from "./AverageBlockTime";
import LatestBlockStat from "./LatestBlockStat";
import SupplyStats from "./SupplyStats";
import { useGlobalStats } from "../context/GlobalStatsContext";

interface SupplyResponse {
  circulatingSupply: string;
  distributedSupply: string;
  percentDistributed: string;
  lockedAccounts: string[];
  distributingAccounts: string[];
}

const GlobalStats: React.FC = () => {
  const { state, dispatch } = useGlobalStats();

  useEffect(() => {
    const fetchCirculatingSupply = async () => {
      try {
        const response = await fetch('https://circulating.voi.network/api/circulating-supply');
        const data: SupplyResponse = await response.json();

        dispatch({
          type: "UPDATE_SUPPLY",
          payload: {
            circulatingSupply: data.circulatingSupply,
            distributedSupply: data.distributedSupply,
            percentDistributed: data.percentDistributed,
            totalBlocksAnalyzed: state.totalBlocksAnalyzed,
            newDiffs: [],
            latestBlock: state.latestBlock,
          },
        });
      } catch (error) {
        console.error("Error fetching circulating supply:", error);
      }
    };

    fetchCirculatingSupply();
    const interval = setInterval(fetchCirculatingSupply, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [dispatch, state.latestBlock, state.totalBlocksAnalyzed]);

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      <LatestBlockStat latestBlock={state.latestBlock} />
      <AverageBlockTime
        averageBlockTime={state.averageBlockTime}
        totalBlocksAnalyzed={state.totalBlocksAnalyzed}
      />
      <SupplyStats
        circulatingSupply={state.circulatingSupply}
        distributedSupply={state.distributedSupply}
        percentDistributed={state.percentDistributed}
      />
    </SimpleGrid>
  );
};

export default GlobalStats; 