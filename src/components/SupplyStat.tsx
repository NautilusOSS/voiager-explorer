import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  VStack,
  Text,
  Box,
} from "@chakra-ui/react";

interface SupplyStatProps {
  circulatingSupply: string;
}

const SupplyStat: React.FC<SupplyStatProps> = ({ circulatingSupply }) => {
  const TOTAL_SUPPLY = 10_000_000_000; // 10 Billion

  const formatNumber = (num: string | number) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });
  };

  const percentage = (parseFloat(circulatingSupply) / TOTAL_SUPPLY) * 100;

  return (
    <Card>
      <CardBody>
        <VStack align="stretch" spacing={3}>
          <Stat>
            <StatLabel>Supply</StatLabel>
            <StatNumber>{formatNumber(circulatingSupply)} VOI</StatNumber>
            <StatHelpText>
              of {formatNumber(TOTAL_SUPPLY)} VOI total
            </StatHelpText>
          </Stat>
          <Box>
            <Progress 
              value={percentage} 
              size="sm" 
              borderRadius="full"
              colorScheme="blue"
            />
            <Text fontSize="sm" mt={1} color="gray.500">
              {percentage.toFixed(2)}% in circulation
            </Text>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SupplyStat; 