import React from "react";
import { SimpleGrid } from "@chakra-ui/react";
import AverageBlockTime from "./AverageBlockTime";
import LatestBlockStat from "./LatestBlockStat";
import SupplyStats from "./SupplyStats";
import { useGlobalStats } from "../context/GlobalStatsContext";

const GlobalStats: React.FC = () => {
  const { state } = useGlobalStats();

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