import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup,
  Stack,
} from "@chakra-ui/react";

interface SupplyStatsProps {
  circulatingSupply: string;
  distributedSupply: string;
  percentDistributed: string;
}

const SupplyStats: React.FC<SupplyStatsProps> = ({
  circulatingSupply,
  distributedSupply,
  percentDistributed,
}) => {
  const TOTAL_SUPPLY = 10_000_000_000; // 10 Billion

  const formatNumber = (num: string) => {
    return parseFloat(num).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card>
      <CardBody>
        <StatGroup>
          <Stack spacing={4} width="100%">
            <Stat>
              <StatLabel>Circulating Supply</StatLabel>
              <StatNumber>{formatNumber(circulatingSupply)} VOI</StatNumber>
              <StatHelpText>
                {((parseFloat(circulatingSupply) / TOTAL_SUPPLY) * 100).toFixed(2)}% of total
              </StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Total Supply</StatLabel>
              <StatNumber>{TOTAL_SUPPLY.toLocaleString()} VOI</StatNumber>
              <StatHelpText>Fixed supply</StatHelpText>
            </Stat>
          </Stack>
        </StatGroup>
      </CardBody>
    </Card>
  );
};

export default SupplyStats; 