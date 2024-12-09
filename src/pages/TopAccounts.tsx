import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Heading,
  Spinner,
  Button,
  Flex,
  Badge,
  Progress,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

interface TopAccount {
  address: string;
  balance: number;
}

const TopAccounts: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<TopAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);

  const TOTAL_SUPPLY = 10_000_000_000; // 10 Billion VOI

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://voimain-analytics.nomadex.app/accounts"
      );
      const data = await response.json();
      setAccounts(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleViewMore = () => {
    setDisplayCount((prev) => prev + 20);
  };

  if (loading && accounts.length === 0) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner />
      </Flex>
    );
  }

  if (error && accounts.length === 0) {
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
          Top Accounts by Balance
        </Text>

        <Stack spacing={4}>
          {accounts.slice(0, displayCount).map((account, index) => (
            <Card
              key={account.address}
              onClick={() => navigate(`/account/${account.address}`)}
              cursor="pointer"
              _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Stack spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Flex align="center" gap={2}>
                        <Badge colorScheme="purple">#{index + 1}</Badge>
                        <Heading size="md" fontFamily="mono">
                          {formatAddress(account.address)}
                        </Heading>
                      </Flex>
                    </Box>
                    <Text fontWeight="bold">
                      {(Number(account.balance) / 1_000_000).toFixed(6)} VOI
                    </Text>
                  </Flex>

                  <Box>
                    <Progress
                      value={
                        (Number(account.balance) / (TOTAL_SUPPLY * 1_000_000)) *
                        100
                      }
                      size="sm"
                      colorScheme="blue"
                      borderRadius="full"
                      bg="gray.100"
                      _dark={{ bg: "gray.700" }}
                    />
                    <Text fontSize="sm" color="gray.500" mt={1}>
                      {(
                        (Number(account.balance) / (TOTAL_SUPPLY * 1_000_000)) *
                        100
                      ).toFixed(4)}
                      % of total supply
                    </Text>
                  </Box>
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>

        {displayCount < accounts.length && (
          <Flex justify="center" pt={4}>
            <Button
              onClick={handleViewMore}
              isLoading={loading}
              loadingText="Loading..."
              colorScheme="blue"
            >
              View More
            </Button>
          </Flex>
        )}
      </Stack>
    </Container>
  );
};

export default TopAccounts;
