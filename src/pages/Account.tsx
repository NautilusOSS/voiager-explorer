import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Flex,
  Code,
  useColorModeValue,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { indexerClient } from "../services/algorand";

interface AccountInfo {
  address: string;
  amount: number;
  "amount-without-pending-rewards": number;
  "pending-rewards": number;
  "reward-base": number;
  rewards: number;
  round: number;
  status: string;
  totalAppsOptedIn: number;
  totalAssetsOptedIn: number;
  "created-apps": number[];
  "created-assets": number[];
  "apps-local-state": any[];
  "apps-total-schema": any;
  assets: any[];
}

// Add a custom serializer function
const bigIntSerializer = (key: string, value: any) => {
  // Convert BigInt to string when serializing
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

const Account: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const response = await indexerClient.lookupAccountByID(address!).do();
        setAccount(response.account);
        setError(null);
      } catch (err) {
        setError("Failed to fetch account data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchAccount();
    }
  }, [address]);

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

  if (!account) {
    return (
      <Box p={8} textAlign="center">
        <Text>Account not found</Text>
      </Box>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Account Details</Heading>
          <Button
            onClick={() => setShowRawData(!showRawData)}
            variant="ghost"
            rightIcon={showRawData ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="sm"
          >
            {showRawData ? "Hide" : "View"} Raw Data
          </Button>
        </Flex>

        {showRawData && (
          <Card>
            <CardBody>
              <Box
                bg={bgColor}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
                overflowX="auto"
                p={4}
              >
                <Code display="block" whiteSpace="pre" fontSize="sm">
                  {JSON.stringify(account, bigIntSerializer, 2)}
                </Code>
              </Box>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Heading size="md">Overview</Heading>
              <Divider />
              <Text fontFamily="mono" fontSize="sm">
                {address}
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Stat>
                  <StatLabel>Balance</StatLabel>
                  <StatNumber>
                    {(Number(account.amount) / 1_000_000).toFixed(6)} VOI
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Rewards</StatLabel>
                  <StatNumber>
                    {(Number(account.rewards) / 1_000_000).toFixed(6)} VOI
                  </StatNumber>
                </Stat>
              </SimpleGrid>
            </Stack>
          </CardBody>
        </Card>

        <Tabs>
          <TabList>
            <Tab>Applications ({account["total-apps-opted-in"]})</Tab>
            <Tab>Assets ({account["total-assets-opted-in"]})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Stack spacing={4}>
                <Card>
                  <CardBody>
                    <Stack spacing={4}>
                      <Heading size="sm">Created Apps</Heading>
                      <Divider />
                      {account["created-apps"]?.length > 0 ? (
                        account["created-apps"].map((appId) => (
                          <Text key={appId} fontFamily="mono">
                            App ID: {appId}
                          </Text>
                        ))
                      ) : (
                        <Text color="gray.500">No created apps</Text>
                      )}
                    </Stack>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <Stack spacing={4}>
                      <Heading size="sm">Opted-In Apps</Heading>
                      <Divider />
                      {account["apps-local-state"]?.length > 0 ? (
                        account["apps-local-state"].map((app) => (
                          <Text key={app.id} fontFamily="mono">
                            App ID: {app.id}
                          </Text>
                        ))
                      ) : (
                        <Text color="gray.500">No opted-in apps</Text>
                      )}
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={4}>
                <Card>
                  <CardBody>
                    <Stack spacing={4}>
                      <Heading size="sm">Created Assets</Heading>
                      <Divider />
                      {account["created-assets"]?.length > 0 ? (
                        account["created-assets"].map((assetId) => (
                          <Text key={assetId} fontFamily="mono">
                            Asset ID: {assetId}
                          </Text>
                        ))
                      ) : (
                        <Text color="gray.500">No created assets</Text>
                      )}
                    </Stack>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <Stack spacing={4}>
                      <Heading size="sm">Opted-In Assets</Heading>
                      <Divider />
                      {account.assets?.length > 0 ? (
                        account.assets.map((asset) => (
                          <Text key={asset["asset-id"]} fontFamily="mono">
                            Asset ID: {asset["asset-id"]}
                          </Text>
                        ))
                      ) : (
                        <Text color="gray.500">No opted-in assets</Text>
                      )}
                    </Stack>
                  </CardBody>
                </Card>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default Account;
