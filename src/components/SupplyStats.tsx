import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Stack,
  Progress,
  Text,
  Box,
} from "@chakra-ui/react";

interface SupplyStatsProps {
  circulatingSupply: string;
  distributedSupply: string;
  percentDistributed: string;
}

const SupplyStats: React.FC<SupplyStatsProps> = ({
  circulatingSupply,
}) => {
  const TOTAL_SUPPLY = 10_000_000_000; // 10 Billion

  const formatNumber = (num: string | number) => {
    return Number(num).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const percentCirculating = (parseFloat(circulatingSupply) / TOTAL_SUPPLY) * 100;

  return (
    <Card>
      <CardBody>
        <Stack spacing={4}>
          <Stat>
            <StatLabel>Supply</StatLabel>
            <StatNumber>{formatNumber(circulatingSupply)} VOI</StatNumber>
            <StatHelpText>
              of {formatNumber(TOTAL_SUPPLY)} VOI total
            </StatHelpText>
          </Stat>
          <Box>
            <Progress 
              value={percentCirculating} 
              size="sm" 
              colorScheme="blue"
              borderRadius="full"
              bg="gray.100"
              _dark={{ bg: "gray.700" }}
            />
            <Text fontSize="sm" color="gray.500" mt={1}>
              {percentCirculating.toFixed(2)}% in circulation
            </Text>
          </Box>
        </Stack>
      </CardBody>
    </Card>
  );
};

export default SupplyStats;
