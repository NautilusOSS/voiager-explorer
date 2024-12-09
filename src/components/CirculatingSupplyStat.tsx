import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";

interface CirculatingSupplyStatProps {
  circulatingSupply: string;
}

const CirculatingSupplyStat: React.FC<CirculatingSupplyStatProps> = ({
  circulatingSupply,
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
        <Stat>
          <StatLabel>Circulating Supply</StatLabel>
          <StatNumber>{formatNumber(circulatingSupply)} VOI</StatNumber>
          <StatHelpText>
            {((parseFloat(circulatingSupply) / TOTAL_SUPPLY) * 100).toFixed(2)}% of total
          </StatHelpText>
        </Stat>
      </CardBody>
    </Card>
  );
};

export default CirculatingSupplyStat; 