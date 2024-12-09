import React from "react";
import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";

interface LatestBlockStatProps {
  latestBlock: number | null;
}

const LatestBlockStat: React.FC<LatestBlockStatProps> = ({ latestBlock }) => {
  return (
    <Card>
      <CardBody>
        <Stat>
          <StatLabel>Latest Block</StatLabel>
          <StatNumber>
            {latestBlock !== null ? latestBlock.toLocaleString() : 'Loading...'}
          </StatNumber>
          <StatHelpText>
            Current round
          </StatHelpText>
        </Stat>
      </CardBody>
    </Card>
  );
};

export default LatestBlockStat; 