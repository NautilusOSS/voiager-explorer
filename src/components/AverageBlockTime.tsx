import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";

interface AverageBlockTimeProps {
  averageBlockTime: number;
  totalBlocksAnalyzed: number;
}

const AverageBlockTime: React.FC<AverageBlockTimeProps> = ({
  averageBlockTime,
  totalBlocksAnalyzed,
}) => {
  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel>Average Block Time</StatLabel>
          <StatNumber>
            {averageBlockTime > 0 ? `${averageBlockTime.toFixed(2)} seconds` : 'Calculating...'}
          </StatNumber>
          <StatHelpText>
            Based on last {totalBlocksAnalyzed} blocks
          </StatHelpText>
        </Stat>
      </CardBody>
    </Card>
  );
};

export default AverageBlockTime;
