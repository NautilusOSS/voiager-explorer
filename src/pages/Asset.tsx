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
  Avatar,
  Image,
  ButtonGroup,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  ExternalLinkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@chakra-ui/icons";
import { indexerClient } from "../services/algorand";
import { Transaction as TransactionComponent } from "../components/Transaction";

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

interface AssetInfo {
  index: number;
  params: {
    clawback?: string;
    creator: string;
    decimals: number;
    defaultFrozen?: boolean;
    freeze?: string;
    manager?: string;
    name?: string;
    reserve?: string;
    total: number | bigint;
    unitName?: string;
    url?: string;
  };
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

// Add interface for asset metadata
interface AssetMetadata {
  name?: string;
  description?: string;
  image?: string;
  image_integrity?: string;
  image_mimetype?: string;
  external_url?: string;
}

// Add interface for asset balances
interface AssetBalance {
  address: string;
  amount: number;
  deleted: boolean;
  optedInAtRound: number;
}

const Asset: React.FC = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState<RawDataState>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showRawTxnData, setShowRawTxnData] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [assetMetadata, setAssetMetadata] = useState<AssetMetadata | null>(
    null
  );
  const [showMetadata, setShowMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [prevTokens, setPrevTokens] = useState<string[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const TRANSACTIONS_PER_PAGE = 10;
  const [maxRound, setMaxRound] = useState<number | null>(null);
  const [holders, setHolders] = useState<AssetBalance[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersCurrentPage, setHoldersCurrentPage] = useState(1);
  const HOLDERS_PER_PAGE = 10;

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Helper function to handle raw data toggling
  const toggleRawData = (id: string) => {
    setShowRawData((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchLastRound = async () => {
    try {
      const status = await indexerClient.makeHealthCheck().do();
      setMaxRound(Number(status.round));
    } catch (err) {
      console.error("Error fetching last round:", err);
    }
  };

  useEffect(() => {
    fetchLastRound();
  }, []);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        setLoading(true);
        const assetResponse = await indexerClient
          .lookupAssetByID(Number(assetId))
          .do();
        setAsset(assetResponse.asset);

        // Update URL fetching logic to handle JSON metadata
        if (assetResponse.asset.params.url) {
          try {
            let url = assetResponse.asset.params.url;
            // Handle IPFS URLs by converting to IPFS.io gateway URL
            if (url.startsWith("ipfs://")) {
              const ipfsHash = url.replace("ipfs://", "");
              url = `https://ipfs.io/ipfs/${ipfsHash}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            // Convert IPFS image URL if present
            if (data.image && data.image.startsWith("ipfs://")) {
              const ipfsHash = data.image.replace("ipfs://", "");
              data.image = `https://ipfs.io/ipfs/${ipfsHash}`;
            }
            setAssetMetadata(data);
          } catch (urlError) {
            console.error("Failed to fetch asset metadata:", urlError);
          }
        }

        setError(null);
      } catch (err) {
        setError("Failed to fetch asset data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  // Update the transactions fetching effect
  useEffect(() => {
    if (!maxRound) return;
    const fetchTransactions = async () => {
      if (activeTab === "transactions" && !transactionsLoaded) {
        try {
          let response;
          response = await indexerClient
            .lookupAssetTransactions(Number(assetId))
            .maxRound(Number(maxRound))
            .minRound(Number(maxRound) - 1000)
            .do();
          const sortedTransactions = [...response.transactions].sort(
            (a, b) => Number(b.confirmedRound) - Number(a.confirmedRound)
          );
          setTransactions(sortedTransactions);
          setTransactionsLoaded(true);
          setHasNextPage(true);
        } catch (err) {
          console.error("Failed to fetch transactions:", err);
        }
      }
    };
    fetchTransactions();
  }, [activeTab, transactionsLoaded, assetId, nextToken, maxRound]);

  // Add pagination handlers
  const handleNextPage = () => {
    if (hasNextPage) {
      setPrevTokens([...prevTokens, nextToken || ""]);
      setCurrentPage(currentPage + 1);
      setTransactionsLoaded(false);
      setMaxRound(maxRound - 2000);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPrevTokens = [...prevTokens];
      const prevToken = newPrevTokens.pop();
      setPrevTokens(newPrevTokens);
      setNextToken(prevToken || null);
      setCurrentPage(currentPage - 1);
      setTransactionsLoaded(false);
      setMaxRound(maxRound - 5000);
    }
  };

  // Update holders fetching effect
  useEffect(() => {
    if (activeTab === "holders" && !holders.length) {
      const fetchHolders = async () => {
        try {
          setHoldersLoading(true);
          const response = await indexerClient
            .lookupAssetBalances(Number(assetId))
            .includeAll(true)
            .do();

          const filteredHolders = response.balances
            .filter(
              (holder) =>
                holder.amount > 0 && holder.address !== asset?.params.reserve
            )
            .sort((a, b) => Number(b.amount) - Number(a.amount));

          setHolders(filteredHolders);
        } catch (err) {
          console.error("Failed to fetch holders:", err);
        } finally {
          setHoldersLoading(false);
        }
      };
      fetchHolders();
    }
  }, [activeTab, holders.length, assetId, asset?.params.reserve]);

  // Add helper function to get paginated holders
  const getPaginatedHolders = () => {
    const startIndex = (holdersCurrentPage - 1) * HOLDERS_PER_PAGE;
    const endIndex = startIndex + HOLDERS_PER_PAGE;
    return holders.slice(startIndex, endIndex);
  };

  // Update the holders pagination handlers
  const handleNextHoldersPage = () => {
    if (holdersCurrentPage * HOLDERS_PER_PAGE < holders.length) {
      setHoldersCurrentPage(holdersCurrentPage + 1);
    }
  };

  const handlePrevHoldersPage = () => {
    if (holdersCurrentPage > 1) {
      setHoldersCurrentPage(holdersCurrentPage - 1);
    }
  };

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

  if (!asset) {
    return (
      <Box p={8} textAlign="center">
        <Text>Asset not found</Text>
      </Box>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Asset Overview</Heading>
          <Button
            onClick={() => toggleRawData("overview")}
            variant="ghost"
            rightIcon={
              showRawData.overview ? <ChevronUpIcon /> : <ChevronDownIcon />
            }
            size="sm"
          >
            {showRawData.overview ? "Hide" : "View"} Raw Data
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
                  {JSON.stringify(asset, bigIntSerializer, 2)}
                </Code>
              </Box>
            </CardBody>
          </Card>
        )}
        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Flex align="center" gap={4}>
                {assetMetadata?.image ? (
                  <Image
                    src={assetMetadata.image}
                    alt={asset.params.name || asset.params.unitName || "Asset"}
                    boxSize="64px"
                    objectFit="cover"
                    borderRadius="md"
                    fallback={
                      <Avatar
                        size="lg"
                        name={
                          asset.params.name || asset.params.unitName || "Asset"
                        }
                      />
                    }
                  />
                ) : (
                  <Avatar
                    size="lg"
                    name={asset.params.name || asset.params.unitName || "Asset"}
                  />
                )}
                <Stack spacing={0}>
                  <Heading size="md">
                    {asset.params.name ||
                      asset.params.unitName ||
                      `Asset #${asset.index}`}
                  </Heading>
                  <Text color="gray.500">ID: {asset.index.toString()}</Text>
                </Stack>
              </Flex>
              <Divider />

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Total Supply</StatLabel>
                  <StatNumber>
                    {(
                      Number(asset.params.total) /
                      Math.pow(10, asset.params.decimals)
                    ).toLocaleString()}
                    {asset.params.unitName && (
                      <Text as="span" fontSize="sm" ml={1}>
                        {asset.params.unitName}
                      </Text>
                    )}
                  </StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Decimals</StatLabel>
                  <StatNumber>{asset.params.decimals}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Default Frozen</StatLabel>
                  <StatNumber>
                    {asset.params.defaultFrozen ? "Yes" : "No"}
                  </StatNumber>
                </Stat>
              </SimpleGrid>

           

              {/* Asset URL & Metadata */}
              {asset.params.url && (
                <Box>
                  <Heading size="sm" mb={4}>
                    Asset URL & Metadata
                  </Heading>
                  <Stack spacing={2}>
                    <Flex justify="space-between" align="center">
                      <Link
                        href={assetMetadata?.external_url || asset.params.url}
                        isExternal
                        color="blue.500"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(
                            assetMetadata?.external_url || asset.params.url,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        }}
                      >
                        {assetMetadata?.external_url || asset.params.url}{" "}
                        <ExternalLinkIcon mx="2px" />
                      </Link>
                      {assetMetadata && (
                        <Button
                          onClick={() => setShowMetadata(!showMetadata)}
                          variant="ghost"
                          rightIcon={
                            showMetadata ? (
                              <ChevronUpIcon />
                            ) : (
                              <ChevronDownIcon />
                            )
                          }
                          size="sm"
                        >
                          {showMetadata ? "Hide" : "View"} Metadata
                        </Button>
                      )}
                    </Flex>

                    {showMetadata && assetMetadata && (
                      <Card variant="outline">
                        <CardBody>
                          <Stack spacing={3}>
                            {assetMetadata.description && (
                              <Text>{assetMetadata.description}</Text>
                            )}
                            {assetMetadata.image && (
                              <Box>
                                <Text fontWeight="bold" mb={2}>
                                  Image
                                </Text>
                                <Link
                                  href={assetMetadata.image}
                                  isExternal
                                  color="blue.500"
                                >
                                  {assetMetadata.image}{" "}
                                  <ExternalLinkIcon mx="2px" />
                                </Link>
                              </Box>
                            )}
                            {assetMetadata.external_url && (
                              <Box>
                                <Text fontWeight="bold" mb={2}>
                                  External URL
                                </Text>
                                <Link
                                  href={assetMetadata.external_url}
                                  isExternal
                                  color="blue.500"
                                >
                                  {assetMetadata.external_url}{" "}
                                  <ExternalLinkIcon mx="2px" />
                                </Link>
                              </Box>
                            )}
                            {(assetMetadata.image_integrity ||
                              assetMetadata.image_mimetype) && (
                              <Box>
                                <Text fontWeight="bold" mb={2}>
                                  Image Details
                                </Text>
                                <Stack spacing={1}>
                                  {assetMetadata.image_integrity && (
                                    <Text fontSize="sm">
                                      Integrity: {assetMetadata.image_integrity}
                                    </Text>
                                  )}
                                  {assetMetadata.image_mimetype && (
                                    <Text fontSize="sm">
                                      MIME Type: {assetMetadata.image_mimetype}
                                    </Text>
                                  )}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </CardBody>
                      </Card>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardBody>
        </Card>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Asset Details</Heading>
        </Flex>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
          <Card
            as="button"
            onClick={() =>
              setActiveTab(activeTab === "transactions" ? null : "transactions")
            }
            cursor="pointer"
            _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
            bg={
              activeTab === "transactions"
                ? useColorModeValue("gray.100", "gray.600")
                : undefined
            }
          >
            <CardBody>
              <Stack align="center" spacing={2}>
                <Text fontWeight="bold">Activity</Text>
                <Text fontSize="sm" color="gray.500">
                  View recent activity
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card
            as="button"
            onClick={() =>
              setActiveTab(activeTab === "holders" ? null : "holders")
            }
            cursor="pointer"
            _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
            bg={
              activeTab === "holders"
                ? useColorModeValue("gray.100", "gray.600")
                : undefined
            }
          >
            <CardBody>
              <Stack align="center" spacing={2}>
                <Text fontWeight="bold">Holders</Text>
                <Text fontSize="sm" color="gray.500">
                  View asset holders
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Card
            as="button"
            onClick={() => {
              setActiveTab(
                activeTab === "relatedAddresses" ? null : "relatedAddresses"
              );
            }}
            cursor="pointer"
            _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
            bg={
              activeTab === "relatedAddresses"
                ? useColorModeValue("gray.100", "gray.600")
                : undefined
            }
          >
            <CardBody>
              <Stack align="center" spacing={2}>
                <Text fontWeight="bold">Related Addresses</Text>
                <Text fontSize="sm" color="gray.500">
                  View related addresses
                </Text>
              </Stack>
            </CardBody>
          </Card>

          {/*<Card
            as="button"
            onClick={() => {
            }}
            cursor="pointer"
            _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
          >
            <CardBody>
              <Stack align="center" spacing={2}>
                <Text fontWeight="bold">Analytics</Text>
                <Text fontSize="sm" color="gray.500">
                  View asset metrics
                </Text>
              </Stack>
            </CardBody>
          </Card>*/}
        </SimpleGrid>
        {/* Only show transactions card when transactions tab is active */}
        {activeTab === "transactions" && (
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Heading size="sm">Recent Transactions</Heading>
              <ButtonGroup size="sm" variant="outline">
                <Button
                  leftIcon={<ArrowLeftIcon />}
                  onClick={handlePrevPage}
                  isDisabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  rightIcon={<ArrowRightIcon />}
                  onClick={handleNextPage}
                  //isDisabled={!hasNextPage}
                >
                  Next
                </Button>
              </ButtonGroup>
            </Flex>
            <Divider />

            {transactions.length > 0 ? (
              transactions.map((tx: any) => (
                <TransactionComponent compact key={tx.id} transaction={tx} />
              ))
            ) : (
              <Text color="gray.500">No transactions found</Text>
            )}

            {/* {showRawTxnData ? (
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
                        new Date(dateB).getTime() - new Date(dateA).getTime()
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
                                  <Flex justify="space-between" align="center">
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
                                      <Text fontSize="sm" color="gray.500">
                                        {formatDateTime(txn.roundTime).date}
                                        {" • "}
                                        {formatDateTime(txn.roundTime).time}
                                      </Text>
                                      {txn.paymentTransaction && (
                                        <Text fontWeight="bold">
                                          {(
                                            Number(
                                              txn.paymentTransaction.amount
                                            ) / 1_000_000
                                          ).toFixed(6)}{" "}
                                          VOI
                                        </Text>
                                      )}
                                    </Box>
                                  </Flex>
                                  <TransactionLink txId={txn.id} />
                                  <Flex align="center" gap={2} fontSize="sm">
                                    <Link to={`/account/${txn.sender}`}>
                                      <CopyableAddress address={txn.sender} />
                                    </Link>
                                    {(txn.paymentTransaction?.receiver ||
                                      txn.assetTransferTransaction
                                        ?.receiver) && (
                                      <>
                                        <Text color="gray.500">→</Text>
                                        <Link to={`/account/${txn.paymentTransaction?.receiver || txn.assetTransferTransaction?.receiver}`}>
                                          <CopyableAddress
                                            address={
                                              txn.paymentTransaction?.receiver ||
                                              txn.assetTransferTransaction
                                                ?.receiver
                                            }
                                          />
                                        </Link>
                                      </>
                                    )}
                                  </Flex>
                                  {txn.note && renderNote(formatNote(txn.note))}

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
                                    {showRawData[txn.id] ? "Hide" : "View"} Raw
                                    Data
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

                                  {txn.innerTxns &&
                                    txn.innerTxns.length > 0 && (
                                      <Accordion allowToggle>
                                        <AccordionItem border="none">
                                          <AccordionButton px={0}>
                                            <Box flex="1" textAlign="left">
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
                                                                ) / 1_000_000
                                                              ).toFixed(6)}{" "}
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
                                                          txId={innerTxn.id}
                                                        />
                                                        <Flex
                                                          align="center"
                                                          gap={2}
                                                          fontSize="sm"
                                                        >
                                                          <Link to={`/account/${innerTxn.sender}`}>
                                                            <CopyableAddress
                                                              address={
                                                                innerTxn.sender
                                                              }
                                                            />
                                                          </Link>
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
                                                              <Link to={`/account/${innerTxn.paymentTransaction?.receiver || innerTxn.assetTransferTransaction?.receiver}`}>
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
                                                              </Link>
                                                            </>
                                                          )}
                                                        </Flex>
                                                        {innerTxn
                                                          .applicationTransaction
                                                          ?.applicationArgs && (
                                                          <Box>
                                                            <Text
                                                              fontWeight="semibold"
                                                              fontSize="sm"
                                                            >
                                                              Application Args
                                                            </Text>
                                                            <Stack spacing={1}>
                                                              {innerTxn.applicationTransaction.applicationArgs.map(
                                                                (
                                                                  arg: Uint8Array,
                                                                  index: number
                                                                ) => (
                                                                  <Text
                                                                    key={index}
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
                )} */}

            {/* Add pagination controls at the bottom as well */}
            <Flex justify="center" mt={4}>
              <ButtonGroup size="sm" variant="outline">
                <Button
                  leftIcon={<ArrowLeftIcon />}
                  onClick={handlePrevPage}
                  isDisabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  rightIcon={<ArrowRightIcon />}
                  onClick={handleNextPage}
                  //isDisabled={!hasNextPage}
                >
                  Next
                </Button>
              </ButtonGroup>
            </Flex>
          </Stack>
        )}
        {/* Add holders section */}
        {activeTab === "holders" && (
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Heading size="sm">Asset Holders</Heading>
              <ButtonGroup size="sm" variant="outline">
                <Button
                  leftIcon={<ArrowLeftIcon />}
                  onClick={handlePrevHoldersPage}
                  isDisabled={holdersCurrentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  rightIcon={<ArrowRightIcon />}
                  onClick={handleNextHoldersPage}
                  isDisabled={
                    holdersCurrentPage * HOLDERS_PER_PAGE >= holders.length
                  }
                >
                  Next
                </Button>
              </ButtonGroup>
            </Flex>
            <Divider />

            {holdersLoading ? (
              <Flex justify="center" p={8}>
                <Spinner />
              </Flex>
            ) : holders.length > 0 ? (
              <Card>
                <CardBody>
                  <Stack spacing={4}>
                    {getPaginatedHolders().map((holder, index) => (
                      <Box key={holder.address}>
                        {index > 0 && <Divider />}
                        <Flex justify="space-between" align="center" py={2}>
                          <Box>
                            <Link to={`/account/${holder.address}`}>
                              <CopyableAddress address={holder.address} />
                            </Link>
                            <Text fontSize="sm" color="gray.500">
                              Opted in at round{" "}
                              <Link
                                as={Link}
                                to={`/block/${holder.optedInAtRound}`}
                                color="blue.500"
                                textDecoration="underline"
                              >
                                {holder.optedInAtRound.toString()}
                              </Link>
                            </Text>
                          </Box>
                          <Text fontWeight="bold">
                            {(
                              Number(holder.amount) /
                              Math.pow(10, asset.params.decimals)
                            ).toLocaleString()}{" "}
                            {asset.params.unitName}
                          </Text>
                        </Flex>
                      </Box>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            ) : (
              <Text color="gray.500">No holders found</Text>
            )}

            {/* Bottom pagination controls */}
            {holders.length > 0 && (
              <Flex justify="center" mt={4}>
                <ButtonGroup size="sm" variant="outline">
                  <Button
                    leftIcon={<ArrowLeftIcon />}
                    onClick={handlePrevHoldersPage}
                    isDisabled={holdersCurrentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    rightIcon={<ArrowRightIcon />}
                    onClick={handleNextHoldersPage}
                    isDisabled={
                      holdersCurrentPage * HOLDERS_PER_PAGE >= holders.length
                    }
                  >
                    Next
                  </Button>
                </ButtonGroup>
              </Flex>
            )}
          </Stack>
        )}
         {activeTab === "relatedAddresses" && (
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Heading size="sm">Related Addresses</Heading>
            </Flex>
            <Divider />
            
            <Card>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <Stack spacing={3}>
                    <Box>
                      <Text fontWeight="medium" color="gray.500" fontSize="sm">
                        Creator
                      </Text>
                      <Link to={`/account/${asset.params.creator}`}>
                        <CopyableAddress address={asset.params.creator} />
                      </Link>
                    </Box>
                    {asset.params.manager && (
                      <Box>
                        <Text fontWeight="medium" color="gray.500" fontSize="sm">
                          Manager
                        </Text>
                        <Link to={`/account/${asset.params.manager}`}>
                          <CopyableAddress address={asset.params.manager} />
                        </Link>
                      </Box>
                    )}
                    {asset.params.reserve && (
                      <Box>
                        <Text fontWeight="medium" color="gray.500" fontSize="sm">
                          Reserve
                        </Text>
                        <Link to={`/account/${asset.params.reserve}`}>
                          <CopyableAddress address={asset.params.reserve} />
                        </Link>
                      </Box>
                    )}
                  </Stack>
                  <Stack spacing={3}>
                    {asset.params.freeze && (
                      <Box>
                        <Text fontWeight="medium" color="gray.500" fontSize="sm">
                          Freeze Address
                        </Text>
                        <Link to={`/account/${asset.params.freeze}`}>
                          <CopyableAddress address={asset.params.freeze} />
                        </Link>
                      </Box>
                    )}
                    {asset.params.clawback && (
                      <Box>
                        <Text fontWeight="medium" color="gray.500" fontSize="sm">
                          Clawback Address
                        </Text>
                        <Link to={`/account/${asset.params.clawback}`}>
                          <CopyableAddress address={asset.params.clawback} />
                        </Link>
                      </Box>
                    )}
                  </Stack>
                </SimpleGrid>
              </CardBody>
            </Card>
          </Stack>
         )}
      </Stack>
    </Container>
  );
};

export default Asset;
