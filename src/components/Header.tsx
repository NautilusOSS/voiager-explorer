import React, { useEffect, useState } from "react";
import {
  Flex,
  Box,
  useColorMode,
  IconButton,
  VStack,
} from "@chakra-ui/react";
import { SunIcon, MoonIcon } from "@chakra-ui/icons";
import VoiPrice from "./VoiPrice";
import Navigation from "./Navigation";
import { getVoiPrice } from "../services/price";

const Header: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [price, setPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const data = await getVoiPrice();
        setPrice(data.voi.usd);
        setPriceChange(data.voi.usd_24h_change);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <VStack w="100vw" spacing={0} position="sticky" top={0} zIndex={100}>
      <Box 
        w="100%" 
        borderBottom="1px" 
        borderColor={colorMode === "light" ? "gray.200" : "gray.700"}
        bg={colorMode === "light" ? "white" : "gray.800"}
      >
        <Flex
          justify="space-between"
          align="center"
          py={3}
          px={{ base: 2, md: 4 }}
          maxW="8xl"
          mx="auto"
          w="100%"
        >
          <Box>
            <VoiPrice price={price} priceChange={priceChange} />
          </Box>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />
        </Flex>
      </Box>
      <Navigation />
    </VStack>
  );
};

export default Header;
