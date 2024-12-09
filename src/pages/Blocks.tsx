// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Divider,
  Spinner,
  Button,
  Flex,
} from "@chakra-ui/react";
import { algodClient } from "../services/algorand";

interface Block {
  block: {
    header: {
      round: bigint;
      timestamp: number;
      proposer: Uint8Array;
    };
    payset: any[];
  };
}

const Blocks: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxRound, setMaxRound] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState<number | null>(null);

  const fetchLastRound = async () => {
    try {
      const status = await algodClient.status().do();
      setMaxRound(Number(status.lastRound));
      setCurrentRound(Number(status.lastRound));
    } catch (err) {
      console.error("Error fetching last round:", err);
    }
  };

  const fetchBlocks = async () => {
    try {
      setLoading(true);

      if (!currentRound) return;

      const newBlocks = [];
      const targetSize = 20;
      let round = currentRound;

      // Keep fetching until we have enough blocks with transactions
      while (newBlocks.length < targetSize && round > 1) {
        const block = await algodClient.block(round).do();
        if (block.block.payset.length > 0) {
          newBlocks.push(block);
        }
        round--;
      }

      setBlocks((prev) => [...prev, ...newBlocks]);
      setCurrentRound(round);
      setError(null);
    } catch (err) {
      console.error("Error fetching blocks:", err);
      setError("Failed to fetch blocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLastRound();
  }, []);

  useEffect(() => {
    if (currentRound === maxRound) {
      fetchBlocks();
    }
  }, [currentRound, maxRound]);

  const handleClick = (round: number) => {
    navigate(`/block/${round}`);
  };

  const loadMore = () => {
    fetchBlocks();
  };

  if (loading && blocks.length === 0) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner />
      </Flex>
    );
  }

  if (error && blocks.length === 0) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500">{error}</Text>
      </Box>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Blocks
        </Text>

        <Stack spacing={4}>
          {blocks.map((block) => (
            <Card
              key={block.block.header.round.toString()}
              onClick={() => handleClick(Number(block.block.header.round))}
              cursor="pointer"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
              transition="all 0.2s"
            >
              <CardBody>
                <Stack spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Heading size="md">
                        Block {block.block.header.round.toString()}
                      </Heading>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(
                          Number(block.block.header.timestamp) * 1000
                        ).toLocaleString()}
                      </Text>
                    </Box>
                  </Flex>

                  <Divider />

                  <StatGroup>
                    <Stat>
                      <StatLabel>Transactions</StatLabel>
                      <StatNumber>{block.block.payset.length}</StatNumber>
                    </Stat>
                  </StatGroup>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>

        {currentRound && currentRound > 1 && (
          <Flex justify="center" pt={4}>
            <Button
              onClick={loadMore}
              isLoading={loading}
              loadingText="Loading..."
              colorScheme="blue"
            >
              Load More
            </Button>
          </Flex>
        )}
      </Stack>
    </Container>
  );
};

export default Blocks;
