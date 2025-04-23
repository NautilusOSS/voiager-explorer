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
import { Transaction as TransactionComponent } from "../components/Transaction";

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
  applicationTransaction?: {
    applicationArgs: string[];
    foreignAssets: number[];
  };
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      if (!maxRound) return;

      let query = indexerClient
        .searchForTransactions()
        .maxRound(Number(maxRound))
        .minRound(Number(maxRound) - 1000);

      const response = await query.do();

      // Sort in descending order (newest first)
      const sortedTransactions = [...response.transactions].sort(
        (a, b) => Number(b.confirmedRound) - Number(a.confirmedRound)
      );

      setTransactions(sortedTransactions);

      setError(null);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setMaxRound(maxRound - 1000);
  };

  // Initial fetch
  useEffect(() => {
    fetchLastRound().then(() => {
      fetchTransactions(0);
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

  const renderTransaction = (tx: any) => {
    return <TransactionComponent compact={true} transaction={tx} />;
  };

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Transactions
        </Text>

        <Stack spacing={4}>
          {transactions.map((tx) => {
            return (
              <TransactionComponent
                key={tx.id}
                compact={true}
                transaction={tx}
              />
            );
          })}
        </Stack>

        <Flex justify="center" pt={4}>
          {transactions.length > 0 && (
            <Button
              onClick={loadMore}
              isLoading={loading}
              loadingText="Loading..."
              colorScheme="blue"
            >
              Load More
            </Button>
          )}
        </Flex>
      </Stack>
    </Container>
  );
};

export default Transactions;
