// @ts-nocheck

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Badge,
  Flex,
  SimpleGrid,
  Divider,
  Spinner,
  Button,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { indexerClient } from "../services/algorand";

interface Transaction {
  id: string;
  txType: string;
  sender: string;
  roundTime: number;
  fee: number;
  note?: Uint8Array;
  confirmedRound: number;
  paymentTransaction?: {
    amount: number;
    receiver: string;
  };
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [maxRound, setMaxRound] = useState<number | null>(null);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxnType = (type: string) => {
    return type; //.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "pay":
        return "green";
      case "axfer":
        return "blue";
      case "appl":
        return "purple";
      default:
        return "gray";
    }
  };

  const handleClick = (txId: string) => {
    navigate(`/transaction/${txId}`);
  };

  const fetchLastRound = async () => {
    try {
      const status = await indexerClient.makeHealthCheck().do();
      setMaxRound(Number(status.round));
    } catch (err) {
      console.error("Error fetching last round:", err);
    }
  };

  const fetchTransactions = async (next?: string) => {
    try {
      setLoading(true);

      if (!maxRound) return;

      let query = indexerClient
        .searchForTransactions()
        .limit(20)
        .maxRound(Number(maxRound))
        .minRound(Math.max(1, Number(maxRound) - 1000));

      if (next) {
        query = query.nextToken(next);
      }

      const response = await query.do();

      // Sort in descending order (newest first)
      const sortedTransactions = [...response.transactions].sort(
        (a, b) => Number(b.confirmedRound) - Number(a.confirmedRound)
      );

      // Append to existing transactions
      if (next) {
        setTransactions((prev) => [...prev, ...sortedTransactions]);
      } else {
        setTransactions(sortedTransactions);
      }

      setNextToken(response.nextToken);
      setError(null);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextToken) {
      fetchTransactions(nextToken);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLastRound().then(() => {
      fetchTransactions();
    });
  }, []);

  // Fetch when maxRound changes
  useEffect(() => {
    if (maxRound) {
      fetchTransactions();
    }
  }, [maxRound]);

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner />
      </Flex>
    );
  }

  if (error) {
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
          Transactions
        </Text>

        <Stack spacing={4}>
          {transactions.map((tx) => (
            <Card
              key={tx.id}
              onClick={() => handleClick(tx.id)}
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
                      <Badge colorScheme={getBadgeColor(tx.txType)} mb={2}>
                        {formatTxnType(tx.txType)}
                      </Badge>
                      <Text fontSize="sm" color="gray.500">
                        Round: {tx.confirmedRound.toString()}
                      </Text>
                    </Box>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(tx.roundTime * 1000).toLocaleString()}
                    </Text>
                  </Flex>

                  <Divider />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Box>
                      <Text fontWeight="semibold">From</Text>
                      <Text fontFamily="mono">{formatAddress(tx.sender)}</Text>
                    </Box>
                    {tx.paymentTransaction && (
                      <Box>
                        <Text fontWeight="semibold">To</Text>
                        <Text fontFamily="mono">
                          {formatAddress(tx.paymentTransaction.receiver)}
                        </Text>
                      </Box>
                    )}
                  </SimpleGrid>

                  {tx.paymentTransaction && (
                    <Flex justify="space-between" align="center">
                      <Text fontWeight="semibold">Amount</Text>
                      <Text>
                        {(
                          Number(tx.paymentTransaction.amount) / 1_000_000
                        ).toFixed(6)}{" "}
                        VOI
                      </Text>
                    </Flex>
                  )}

                  <Text fontSize="sm" color="gray.500">
                    Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>

        {nextToken && (
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

export default Transactions;
