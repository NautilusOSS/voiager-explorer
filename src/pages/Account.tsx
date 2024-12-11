// @ts-nocheck

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  Tooltip,
  useToast,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { indexerClient } from "../services/algorand";

interface AccountInfo {
  address: string;
  amount: number;
  amountWithoutPendingRewards: number;
  pendingRewards: number;
  rewardBase: number;
  rewards: number;
  round: number;
  status: string;
  totalAppsOptedIn: number;
  totalAssetsOptedIn: number;
  createdApps: number[];
  createdAssets: number[];
  appsLocalState: any[];
  appsTotalSchema: any;
  assets: any[];
  minBalance: number;
}

interface ParsedNote {
  client?: string;
  type?: "u" | "j";
  message?: string;
  raw?: string;
}

interface RawDataState {
  [key: string]: boolean;
}

// Add the formatNote helper function
const formatNote = (note?: Uint8Array | null): ParsedNote => {
  if (!note) return {};
  try {
    const decoded = new TextDecoder().decode(note);

    // Check for ALGOKIT_DEPLOYER format
    const algoKitMatch = decoded.match(/^ALGOKIT_DEPLOYER:j(.+)$/);
    if (algoKitMatch) {
      try {
        const jsonData = JSON.parse(algoKitMatch[1]);
        return {
          client: "algokit",
          type: "u",
          message: `Deploying ${jsonData.name} v${jsonData.version}`,
          raw: decoded,
        };
      } catch (e) {
        console.error("Error parsing AlgoKit JSON:", e);
      }
    }

    // Check for client:type message format
    const match = decoded.match(/^([^:]+(?:-[\d.]+)?):([uj])\s([\s\S]+)$/);
    if (match) {
      return {
        client: match[1],
        type: match[2] as "u" | "j",
        message: match[3].replace(/\s+/g, " ").trim(),
        raw: decoded,
      };
    }

    return { raw: decoded };
  } catch (error) {
    console.error("Error decoding note:", error);
    return {};
  }
};

// Add a custom serializer function
const bigIntSerializer = (key: string, value: any) => {
  // Convert BigInt to string when serializing
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

// Add this helper function
const formatTransactionData = (transactions: any[]) => {
  return transactions.map((txn) => {
    const formattedTxn = { ...txn };

    // Convert known Uint8Array fields to base64
    if (txn.genesisHash) {
      formattedTxn.genesisHash = Buffer.from(txn.genesisHash).toString(
        "base64"
      );
    }
    if (txn["genesis-id"]) {
      formattedTxn["genesis-id"] = Buffer.from(txn["genesis-id"]).toString(
        "base64"
      );
    }
    if (txn.note) {
      formattedTxn.note = Buffer.from(txn.note).toString("base64");
    }
    if (txn.group) {
      formattedTxn.group = Buffer.from(txn.group).toString("base64");
    }
    if (txn.signature.sig) {
      formattedTxn.signature.sig = Buffer.from(txn.signature.sig).toString(
        "base64"
      );
    }
    if (txn.applicationTransaction?.applicationArgs) {
      formattedTxn.applicationTransaction.applicationArgs =
        txn.applicationTransaction.applicationArgs.map((arg: Uint8Array) =>
          Buffer.from(arg).toString("base64")
        );
    }
    if (txn.innerTxns && txn.innerTxns.length > 0) {
      formattedTxn.innerTxns = txn.innerTxns.map((innerTxn) => {
        if (innerTxn.applicationTransaction?.approvalProgram) {
          innerTxn.applicationTransaction.approvalProgram = Buffer.from(
            innerTxn.applicationTransaction.approvalProgram
          ).toString("base64");
        }
        if (innerTxn.applicationTransaction?.clearStateProgram) {
          innerTxn.applicationTransaction.clearStateProgram = Buffer.from(
            innerTxn.applicationTransaction.clearStateProgram
          ).toString("base64");
        }
        if (innerTxn.applicationTransaction?.applicationArgs) {
          innerTxn.applicationTransaction.applicationArgs =
            innerTxn.applicationTransaction.applicationArgs.map(
              (arg: Uint8Array) => Buffer.from(arg).toString("base64")
            );
        }
        return innerTxn;
      });
    }

    return formattedTxn;
  });
};

// Helper function to format date and time
const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // If within last 24 hours, show relative time
  if (diffInHours < 24) {
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return {
        date: `${minutes} minute${minutes !== 1 ? "s" : ""} ago`,
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      };
    }
    const hours = Math.floor(diffInHours);
    return {
      date: `${hours} hour${hours !== 1 ? "s" : ""} ago`,
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };
  }

  // Otherwise show full date
  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }),
  };
};

// Update the grouping function to use the new date format
const groupTransactionsByDate = (transactions: any[]) => {
  return transactions.reduce(
    (groups: { [key: string]: any[] }, transaction) => {
      const { date } = formatDateTime(transaction.roundTime);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
      return groups;
    },
    {}
  );
};

// Add the renderNote helper function
const renderNote = (note: ParsedNote) => {
  if (!note || (!note.message && !note.raw)) return null;

  return (
    <Stack spacing={1}>
      {note.client && (
        <Text fontSize="xs" color="gray.500">
          Client: {note.client}
        </Text>
      )}
      <Text fontSize="sm" fontFamily="mono">
        {note.message || note.raw}
      </Text>
    </Stack>
  );
};

// Add helper function to format address
const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Add copy to clipboard function
const CopyableAddress: React.FC<{ address: string }> = ({ address }) => {
  const toast = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Flex align="center" gap={2}>
      <Text fontSize="sm" fontFamily="mono">
        {formatAddress(address)}
      </Text>
      <IconButton
        icon={<CopyIcon />}
        aria-label="Copy address"
        size="xs"
        variant="ghost"
        onClick={handleCopy}
      />
    </Flex>
  );
};

// Add helper function to format transaction ID
const formatTxId = (txId: string) => {
  if (!txId) return "";
  return `${txId.slice(0, 4)}...${txId.slice(-4)}`;
};

// Add clickable transaction ID component
const TransactionLink: React.FC<{ txId: string }> = ({ txId }) => {
  return (
    <Flex align="center" gap={2}>
      <Text fontSize="sm" fontFamily="mono" color="gray.500">
        {formatTxId(txId)}
      </Text>
      <IconButton
        as={Link}
        to={`/transaction/${txId}`}
        icon={<ExternalLinkIcon />}
        aria-label="View transaction"
        size="xs"
        variant="ghost"
      />
    </Flex>
  );
};

const Account: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState<RawDataState>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showRawTxnData, setShowRawTxnData] = useState(false);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Helper function to handle raw data toggling
  const toggleRawData = (id: string) => {
    setShowRawData((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true);
        const [accountResponse, txnsResponse] = await Promise.all([
          indexerClient.lookupAccountByID(address!).do(),
          indexerClient.lookupAccountTransactions(address!).do(),
        ]);
        setAccount(accountResponse.account);
        setTransactions(txnsResponse.transactions);
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
            onClick={() => toggleRawData("overview")}
            variant="ghost"
            rightIcon={showRawData ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="sm"
          >
            {showRawData ? "Hide" : "View"} Raw Data
          </Button>
        </Flex>

        {showRawData.overview && (
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
              <SimpleGrid columns={1} spacing={4}>
                <Tooltip
                  label={`Minimum Balance: ${(
                    Number(account.minBalance) / 1_000_000
                  ).toFixed(6)} VOI`}
                  hasArrow
                  placement="top"
                >
                  <Stat>
                    <StatLabel>Balance</StatLabel>
                    <StatNumber>
                      {(Number(account.amount) / 1_000_000).toFixed(6)} VOI
                    </StatNumber>
                  </Stat>
                </Tooltip>
              </SimpleGrid>
            </Stack>
          </CardBody>
        </Card>

        <Tabs>
          <TabList mb={4}>
            <Tab>Transactions</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Stack spacing={4}>
                <Card>
                  <CardBody>
                    <Stack spacing={4}>
                      <Flex justify="space-between" align="center">
                        <Heading size="sm">Recent Transactions</Heading>
                        <Button
                          onClick={() => setShowRawTxnData(!showRawTxnData)}
                          variant="ghost"
                          rightIcon={
                            showRawTxnData ? (
                              <ChevronUpIcon />
                            ) : (
                              <ChevronDownIcon />
                            )
                          }
                          size="sm"
                        >
                          {showRawTxnData ? "Hide" : "View"} Raw Data
                        </Button>
                      </Flex>
                      <Divider />

                      {showRawTxnData ? (
                        <Box
                          bg={bgColor}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={borderColor}
                          overflowX="auto"
                          p={4}
                        >
                          <Code display="block" whiteSpace="pre" fontSize="sm">
                            {JSON.stringify(
                              formatTransactionData(transactions),
                              bigIntSerializer,
                              2
                            )}
                          </Code>
                        </Box>
                      ) : transactions.length > 0 ? (
                        Object.entries(groupTransactionsByDate(transactions))
                          .sort(
                            ([dateA], [dateB]) =>
                              new Date(dateB).getTime() -
                              new Date(dateA).getTime()
                          )
                          .map(([date, txns]) => (
                            <Box key={date}>
                              <Text
                                fontSize="sm"
                                fontWeight="medium"
                                color="gray.500"
                                mb={3}
                              >
                                {date}
                              </Text>
                              <Stack spacing={4}>
                                {txns.map((txn) => (
                                  <Card key={txn.id} variant="outline">
                                    <CardBody>
                                      <Stack spacing={4}>
                                        <Flex
                                          justify="space-between"
                                          align="center"
                                        >
                                          <Box>
                                            <Badge
                                              colorScheme={
                                                txn.txType === "pay"
                                                  ? "green"
                                                  : txn.txType === "appl"
                                                  ? "purple"
                                                  : txn.txType === "axfer"
                                                  ? "blue"
                                                  : "gray"
                                              }
                                            >
                                              {txn.txType.toUpperCase()}
                                            </Badge>
                                          </Box>
                                          <Box textAlign="right">
                                            <Text
                                              fontSize="sm"
                                              color="gray.500"
                                            >
                                              {
                                                formatDateTime(txn.roundTime)
                                                  .date
                                              }
                                              {" • "}
                                              {
                                                formatDateTime(txn.roundTime)
                                                  .time
                                              }
                                            </Text>
                                            {txn.paymentTransaction && (
                                              <Text fontWeight="bold">
                                                {(
                                                  Number(
                                                    txn.paymentTransaction
                                                      .amount
                                                  ) / 1_000_000
                                                ).toFixed(6)}{" "}
                                                VOI
                                              </Text>
                                            )}
                                          </Box>
                                        </Flex>
                                        <TransactionLink txId={txn.id} />
                                        <Flex
                                          align="center"
                                          gap={2}
                                          fontSize="sm"
                                        >
                                          <CopyableAddress
                                            address={txn.sender}
                                          />
                                          {(txn.paymentTransaction?.receiver ||
                                            txn.assetTransferTransaction
                                              ?.receiver) && (
                                            <>
                                              <Text color="gray.500">→</Text>
                                              <CopyableAddress
                                                address={
                                                  txn.paymentTransaction
                                                    ?.receiver ||
                                                  txn.assetTransferTransaction
                                                    ?.receiver
                                                }
                                              />
                                            </>
                                          )}
                                        </Flex>
                                        {txn.note &&
                                          renderNote(formatNote(txn.note))}

                                        {/* Main transaction raw data */}
                                        <Button
                                          onClick={() => toggleRawData(txn.id)}
                                          variant="ghost"
                                          rightIcon={
                                            showRawData[txn.id] ? (
                                              <ChevronUpIcon />
                                            ) : (
                                              <ChevronDownIcon />
                                            )
                                          }
                                          size="sm"
                                        >
                                          {showRawData[txn.id]
                                            ? "Hide"
                                            : "View"}{" "}
                                          Raw Data
                                        </Button>

                                        {showRawData[txn.id] && (
                                          <Box
                                            bg={bgColor}
                                            borderRadius="md"
                                            borderWidth="1px"
                                            borderColor={borderColor}
                                            overflowX="auto"
                                            p={4}
                                          >
                                            <Code
                                              display="block"
                                              whiteSpace="pre"
                                              fontSize="sm"
                                            >
                                              {JSON.stringify(
                                                txn,
                                                bigIntSerializer,
                                                2
                                              )}
                                            </Code>
                                          </Box>
                                        )}

                                        {/* Inner transactions */}
                                        {txn.innerTxns &&
                                          txn.innerTxns.length > 0 && (
                                            <Accordion allowToggle>
                                              <AccordionItem border="none">
                                                <AccordionButton px={0}>
                                                  <Box
                                                    flex="1"
                                                    textAlign="left"
                                                  >
                                                    Inner Transactions (
                                                    {txn.innerTxns.length})
                                                  </Box>
                                                  <AccordionIcon />
                                                </AccordionButton>
                                                <AccordionPanel pb={4} px={0}>
                                                  <Stack spacing={4} pl={4}>
                                                    {txn.innerTxns.map(
                                                      (innerTxn, index) => (
                                                        <Card
                                                          key={index}
                                                          variant="outline"
                                                          size="sm"
                                                        >
                                                          <CardBody>
                                                            <Stack spacing={4}>
                                                              <Flex
                                                                justify="space-between"
                                                                align="center"
                                                              >
                                                                <Box>
                                                                  <Badge
                                                                    colorScheme={
                                                                      innerTxn.txType ===
                                                                      "pay"
                                                                        ? "green"
                                                                        : innerTxn.txType ===
                                                                          "appl"
                                                                        ? "purple"
                                                                        : innerTxn.txType ===
                                                                          "axfer"
                                                                        ? "blue"
                                                                        : "gray"
                                                                    }
                                                                  >
                                                                    {innerTxn.txType.toUpperCase()}
                                                                  </Badge>
                                                                </Box>
                                                                {innerTxn.paymentTransaction && (
                                                                  <Text fontWeight="bold">
                                                                    {(
                                                                      Number(
                                                                        innerTxn
                                                                          .paymentTransaction
                                                                          .amount
                                                                      ) /
                                                                      1_000_000
                                                                    ).toFixed(
                                                                      6
                                                                    )}{" "}
                                                                    VOI
                                                                  </Text>
                                                                )}
                                                                {innerTxn.applicationTransaction && (
                                                                  <Text>
                                                                    App ID:{" "}
                                                                    {innerTxn
                                                                      .applicationTransaction
                                                                      .applicationId ||
                                                                      "Create"}
                                                                  </Text>
                                                                )}
                                                                {innerTxn.assetTransferTransaction && (
                                                                  <Text fontWeight="bold">
                                                                    Asset ID:{" "}
                                                                    {
                                                                      innerTxn
                                                                        .assetTransferTransaction
                                                                        .assetId
                                                                    }
                                                                  </Text>
                                                                )}
                                                              </Flex>
                                                              <TransactionLink
                                                                txId={
                                                                  innerTxn.id
                                                                }
                                                              />
                                                              <Flex
                                                                align="center"
                                                                gap={2}
                                                                fontSize="sm"
                                                              >
                                                                <CopyableAddress
                                                                  address={
                                                                    innerTxn.sender
                                                                  }
                                                                />
                                                                {(innerTxn
                                                                  .paymentTransaction
                                                                  ?.receiver ||
                                                                  innerTxn
                                                                    .assetTransferTransaction
                                                                    ?.receiver) && (
                                                                  <>
                                                                    <Text color="gray.500">
                                                                      →
                                                                    </Text>
                                                                    <CopyableAddress
                                                                      address={
                                                                        innerTxn
                                                                          .paymentTransaction
                                                                          ?.receiver ||
                                                                        innerTxn
                                                                          .assetTransferTransaction
                                                                          ?.receiver
                                                                      }
                                                                    />
                                                                  </>
                                                                )}
                                                              </Flex>
                                                              {/* Add application args display */}
                                                              {innerTxn
                                                                .applicationTransaction
                                                                ?.applicationArgs && (
                                                                <Box>
                                                                  <Text
                                                                    fontWeight="semibold"
                                                                    fontSize="sm"
                                                                  >
                                                                    Application
                                                                    Args
                                                                  </Text>
                                                                  <Stack
                                                                    spacing={1}
                                                                  >
                                                                    {innerTxn.applicationTransaction.applicationArgs.map(
                                                                      (
                                                                        arg: Uint8Array,
                                                                        index: number
                                                                      ) => (
                                                                        <Text
                                                                          key={
                                                                            index
                                                                          }
                                                                          fontSize="sm"
                                                                          fontFamily="mono"
                                                                        >
                                                                          {Buffer.from(
                                                                            arg
                                                                          ).toString(
                                                                            "base64"
                                                                          )}
                                                                        </Text>
                                                                      )
                                                                    )}
                                                                  </Stack>
                                                                </Box>
                                                              )}
                                                              {innerTxn.note &&
                                                                renderNote(
                                                                  formatNote(
                                                                    innerTxn.note
                                                                  )
                                                                )}
                                                              <Button
                                                                onClick={() =>
                                                                  toggleRawData(
                                                                    `${txn.id}-inner-${index}`
                                                                  )
                                                                }
                                                                variant="ghost"
                                                                rightIcon={
                                                                  showRawData[
                                                                    `${txn.id}-inner-${index}`
                                                                  ] ? (
                                                                    <ChevronUpIcon />
                                                                  ) : (
                                                                    <ChevronDownIcon />
                                                                  )
                                                                }
                                                                size="sm"
                                                              >
                                                                {showRawData[
                                                                  `${txn.id}-inner-${index}`
                                                                ]
                                                                  ? "Hide"
                                                                  : "View"}{" "}
                                                                Raw Data
                                                              </Button>
                                                              {showRawData[
                                                                `${txn.id}-inner-${index}`
                                                              ] && (
                                                                <Box
                                                                  bg={bgColor}
                                                                  borderRadius="md"
                                                                  borderWidth="1px"
                                                                  borderColor={
                                                                    borderColor
                                                                  }
                                                                  overflowX="auto"
                                                                  p={4}
                                                                >
                                                                  <Code
                                                                    display="block"
                                                                    whiteSpace="pre"
                                                                    fontSize="sm"
                                                                  >
                                                                    {JSON.stringify(
                                                                      innerTxn,
                                                                      bigIntSerializer,
                                                                      2
                                                                    )}
                                                                  </Code>
                                                                </Box>
                                                              )}
                                                            </Stack>
                                                          </CardBody>
                                                        </Card>
                                                      )
                                                    )}
                                                  </Stack>
                                                </AccordionPanel>
                                              </AccordionItem>
                                            </Accordion>
                                          )}
                                      </Stack>
                                    </CardBody>
                                  </Card>
                                ))}
                              </Stack>
                            </Box>
                          ))
                      ) : (
                        <Text color="gray.500">No transactions found</Text>
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
