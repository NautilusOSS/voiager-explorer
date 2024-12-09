import React from "react";
import {
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Link,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

interface VoiPriceProps {
  price: number | null;
  priceChange: number | null;
}

const VoiPrice: React.FC<VoiPriceProps> = ({ price, priceChange }) => {
  const formatPrice = (price: number | null) => {
    if (price === null) return "Loading...";
    return `$${price.toFixed(4)}`;
  };

  return (
    <Stat>
      <StatLabel>VOI Price</StatLabel>
      <StatNumber fontSize="lg">{formatPrice(price)}</StatNumber>
      <StatHelpText>
        <Link 
          href="https://voi.humble.sh/#/swap?poolId=395553" 
          isExternal
          color="blue.500"
          _dark={{ color: "blue.300" }}
          display="inline-flex"
          alignItems="center"
        >
          aUSDC/VOI pool <ExternalLinkIcon mx="2px" />
        </Link>
      </StatHelpText>
    </Stat>
  );
};

export default VoiPrice; 