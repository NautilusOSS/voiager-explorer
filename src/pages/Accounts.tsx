import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Heading,
  Divider,
  Spinner,
  Button,
  Flex,
  Badge,
  SimpleGrid,
  Link,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { indexerClient } from "../services/algorand";

interface Account {
  address: string;
  amount: number;
  "total-apps-opted-in": number;
  "total-assets-opted-in": number;
  "created-apps": number[];
  "created-assets": number[];
}

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const navigate = useNavigate();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchAccounts = async (next?: string) => {
    try {
      setLoading(true);

      let query = indexerClient.searchAccounts().limit(20);

      if (next) {
        query = query.nextToken(next);
      }

      const response = await query.do();

      // Append to existing accounts
      if (next) {
        setAccounts((prev) => [...prev, ...response.accounts]);
      } else {
        setAccounts(response.accounts);
      }

      setNextToken(response.nextToken);
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

  const loadMore = () => {
    if (nextToken) {
      fetchAccounts(nextToken);
    }
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
          Accounts
        </Text>

        <Stack spacing={4}>
          {accounts.map((account) => (
            <Card key={account.address}>
              <CardBody>
                <Stack spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Heading size="md" fontFamily="mono">
                        {formatAddress(account.address)}
                      </Heading>
                    </Box>
                    <Text fontWeight="bold">
                      {(Number(account.amount) / 1_000_000).toFixed(6)} VOI
                    </Text>
                  </Flex>

                  <Divider />

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Box>
                      <Text fontWeight="semibold">Apps</Text>
                      <Stack direction="row" spacing={2}>
                        <Badge colorScheme="purple">
                          Created: {account["created-apps"]?.length || 0}
                        </Badge>
                        <Badge colorScheme="blue">
                          Opted In: {account["total-apps-opted-in"]}
                        </Badge>
                      </Stack>
                    </Box>
                    <Box>
                      <Text fontWeight="semibold">Assets</Text>
                      <Stack direction="row" spacing={2}>
                        <Badge colorScheme="green">
                          Created: {account["created-assets"]?.length || 0}
                        </Badge>
                        <Badge colorScheme="orange">
                          Opted In: {account["total-assets-opted-in"]}
                        </Badge>
                      </Stack>
                    </Box>
                  </SimpleGrid>
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

export default Accounts;
