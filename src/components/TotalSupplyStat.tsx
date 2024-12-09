import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";

const TotalSupplyStat: React.FC = () => {
  const TOTAL_SUPPLY = 10_000_000_000; // 10 Billion

  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel>Total Supply</StatLabel>
          <StatNumber>{TOTAL_SUPPLY.toLocaleString()} VOI</StatNumber>
          <StatHelpText>Fixed supply</StatHelpText>
        </Stat>
      </CardBody>
    </Card>
  );
};

export default TotalSupplyStat; 