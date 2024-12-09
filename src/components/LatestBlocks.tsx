// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  Box,
  Text,
  Card,
  CardHeader,
  CardBody,
  Stack,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { getLatestBlocks } from "../services/algorand";
import { useGlobalStats } from "../context/GlobalStatsContext";
import { Link as RouterLink } from "react-router-dom";

export interface AlgorandBlock {
  block: {
    header: {
      round: bigint;
      timestamp: number;
      proposer: {
        publicKey: Uint8Array[];
      };
    };
    payset: any[];
  };
}

const MotionCard = motion<any>(Card);

const LatestBlocks: React.FC = () => {
  const [blocks, setBlocks] = useState<AlgorandBlock[]>([]);
  const { dispatch } = useGlobalStats();

  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await getLatestBlocks();
        setBlocks(response.blocks);
        const latestBlock = response.blocks[0]?.block.header.round;
        dispatch({
          type: "UPDATE_STATS",
          payload: {
            averageBlockTime: 0,
            totalBlocksAnalyzed: response.totalBlocksAnalyzed,
            newDiffs: response.newDiffs,
            latestBlock: Number(latestBlock),
          },
        });
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  return (
    <Box w="100%">
      <Stack spacing={4}>
        <Text fontSize="2xl" mb={4}>
          Latest Voi Blocks
        </Text>
        <Stack spacing={4} w="100%">
          <AnimatePresence>
            {blocks.map((block, index) => (
              <RouterLink 
                to={`/block/${block.block.header.round}`} 
                key={block.block.header.round.toString()}
                style={{ width: '100%' }}
              >
                <MotionCard
                  w="100%"
                  borderRadius="lg"
                  boxShadow="md"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  _hover={{
                    transform: "translateY(-2px)",
                    boxShadow: "lg",
                    cursor: "pointer",
                  }}
                  style={{ transition: "all 0.2s ease-in-out" }}
                >
                  <CardHeader pb={2}>
                    <Heading size="md">Block {block.block.header.round.toString()}</Heading>
                  </CardHeader>
                  <CardBody pt={0}>
                    <StatGroup>
                      <Stack spacing={4} direction={{ base: "column", sm: "row" }} w="100%">
                        <Stat>
                          <StatLabel>Transactions</StatLabel>
                          <StatNumber>{block.block.payset.length}</StatNumber>
                        </Stat>
                        <Stat>
                          <StatLabel>Time</StatLabel>
                          <StatNumber fontSize="sm">
                            {new Date(
                              Number(block.block.header.timestamp) * 1000
                            ).toLocaleString()}
                          </StatNumber>
                        </Stat>
                      </Stack>
                    </StatGroup>
                  </CardBody>
                </MotionCard>
              </RouterLink>
            ))}
          </AnimatePresence>
        </Stack>
      </Stack>
    </Box>
  );
};

export default LatestBlocks;
