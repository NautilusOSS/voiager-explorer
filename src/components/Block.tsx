import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardBody,
  Stack,
  Text,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  SimpleGrid,
  Divider,
  Button,
  Code,
  useColorModeValue,
  Flex,
  Badge,
  Link,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { indexerClient } from "../services/algorand";
import { Buffer } from "buffer";

interface BlockData {
  timestamp: number;
  transactions: Array<{
    id: string;
    intra: number;
    fee: number;
    note?: Uint8Array;
    sender: string;
    txType: string;
    paymentTransaction?: {
      amount: number;
      receiver: string;
    };
    applicationTransaction?: {
      applicationId: number;
      applicationArgs?: string[];
    };
    assetTransferTransaction?: {
      assetId: number;
      receiver: string;
    };
    group?: Uint8Array;
  }>;
}

interface ParsedNote {
  client?: string;
  type?: "u" | "j";
  message?: string;
  raw?: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const Block: React.FC = () => {
  const { round } = useParams<{ round: string }>();
  const [block, setBlock] = useState<BlockData | any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [expandedTxns, setExpandedTxns] = useState<Set<string>>(new Set());

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxnType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const toggleTxnRawData = (txId: string) => {
    setExpandedTxns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(txId)) {
        newSet.delete(txId);
      } else {
        newSet.add(txId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        setLoading(true);
        const blockData = await indexerClient.lookupBlock(Number(round)).do();
        setBlock(blockData);
        setError(null);

        // Add scroll behavior after block is loaded
        const hash = window.location.hash;
        if (hash) {
          // Small delay to ensure DOM is updated
          setTimeout(() => {
            const element = document.querySelector(hash);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      } catch (err) {
        setError("Failed to fetch block data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (round) {
      fetchBlock();
    }
  }, [round]);

  // Add custom serializer for BigInt
  const blockSerializer = (_: string, value: any) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };

  const getTransactionTypeCounts = (txns: any[]) => {
    const counts = txns?.reduce((acc: { [key: string]: number }, tx: any) => {
      const type = tx.txType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Convert to format needed for pie chart
    return Object.entries(counts).map(([name, value]) => ({
      name: formatTxnType(name),
      value,
    }));
  };

  const getGroupId = (tx: any) => {
    if (!tx.group) return null;
    return Buffer.from(tx.group).toString("base64");
  };

  const groupTransactions = (transactions: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const ungrouped: any[] = [];

    transactions.forEach((tx) => {
      const groupId = getGroupId(tx);
      if (groupId) {
        if (!groups[groupId]) {
          groups[groupId] = [];
        }
        groups[groupId].push(tx);
      } else {
        ungrouped.push(tx);
      }
    });

    return { groups, ungrouped };
  };

  const renderTransactionGroup = (transactions: any[], groupId: string) => {
    return (
      <Box
        key={groupId}
        border="1px"
        borderStyle="dashed"
        borderColor="gray.200"
        borderRadius="lg"
        p={4}
        mb={4}
        bg="gray.50"
        _dark={{
          borderColor: "gray.700",
          bg: "gray.800",
        }}
      >
        <Text fontSize="sm" color="gray.500" mb={2}>
          Transaction Group: {formatAddress(groupId)}
        </Text>
        <Stack spacing={4}>
          {transactions.map((tx, index) => renderTransaction(tx, index))}
        </Stack>
      </Box>
    );
  };

  const formatNote = (note?: Uint8Array | null): ParsedNote => {
    if (!note) return {};
    try {
      const decoded = new TextDecoder().decode(note);
      console.log("Decoded note:", decoded);

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

      // Updated regex to handle multi-line notes
      const match = decoded.match(/^([^:]+(?:-[\d.]+)?):([uj])\s([\s\S]+)$/);
      if (match) {
        const parsed = {
          client: match[1],
          type: match[2] as "u" | "j",
          message: match[3].replace(/\s+/g, " ").trim(), // Normalize whitespace
          raw: decoded,
        };
        console.log("Parsed note:", parsed);
        return parsed;
      }

      // If no match, return the raw decoded string
      console.log("No match, returning raw");
      return {
        raw: decoded,
      };
    } catch (error) {
      console.error("Error decoding note:", error);
      return {};
    }
  };

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

  const renderTransactionNote = (tx: any) => {
    if (!tx.note) return null;
    const parsedNote = formatNote(tx.note);
    return renderNote(parsedNote);
  };

  const renderTransaction = (tx: any, index: number) => {
    const isExpanded = expandedTxns.has(tx.id);

    const rawDataSection = (
      <>
        <Divider />
        <Button
          onClick={() => toggleTxnRawData(tx.id)}
          variant="ghost"
          size="sm"
          rightIcon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        >
          {isExpanded ? "Hide" : "View"} Raw Data
        </Button>

        {isExpanded && (
          <Box
            bg={useColorModeValue("gray.50", "gray.900")}
            borderRadius="md"
            p={3}
            overflowX="auto"
          >
            <Code display="block" whiteSpace="pre" fontSize="sm">
              {JSON.stringify(tx, blockSerializer, 2)}
            </Code>
          </Box>
        )}
      </>
    );

    const commonCardProps = {
      w: "100%",
      mb: 4,
      variant: "outline",
      id: `tx-${index}`,
    };

    // Payment Transaction
    if (tx.txType === "pay") {
      return (
        <Card key={tx.id} {...commonCardProps}>
          <CardBody>
            <Stack spacing={4}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="green" mb={2}>
                    Payment
                  </Badge>
                  <Text fontFamily="mono" fontSize="sm" color="gray.500">
                    <Link href={`/transaction/${tx.id}`}>{tx.id}</Link>
                  </Text>
                </Box>
                <Text fontWeight="bold">
                  {(Number(tx.paymentTransaction.amount) / 1_000_000).toFixed(
                    6
                  )}{" "}
                  VOI
                </Text>
              </Flex>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="semibold">From</Text>
                  <Text fontFamily="mono">{tx.sender}</Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold">To</Text>
                  <Text fontFamily="mono">
                    {tx.paymentTransaction.receiver}
                  </Text>
                </Box>
              </SimpleGrid>
              {renderTransactionNote(tx)}
              <Text fontSize="sm" color="gray.500">
                Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
              </Text>
              {rawDataSection}
            </Stack>
          </CardBody>
        </Card>
      );
    }

    // Application Call
    if (tx.txType === "appl") {
      return (
        <Card key={tx.id} {...commonCardProps}>
          <CardBody>
            <Stack spacing={4}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="purple" mb={2}>
                    Application Call
                  </Badge>
                  <Text fontFamily="mono" fontSize="sm" color="gray.500">
                    {tx.id}
                  </Text>
                </Box>
                <Text>
                  App ID:{" "}
                  {tx.applicationTransaction?.applicationId
                    ? tx.applicationTransaction?.applicationId.toString()
                    : "Create"}
                </Text>
              </Flex>
              <Divider />
              <Box>
                <Text fontWeight="semibold">From</Text>
                <Text fontFamily="mono">{tx.sender}</Text>
              </Box>
              {tx.applicationTransaction?.applicationArgs && (
                <Box>
                  <Text fontWeight="semibold">Application Args</Text>
                  <Stack spacing={1}>
                    {tx.applicationTransaction.applicationArgs.map(
                      (arg: string, index: number) => (
                        <Text key={index} fontFamily="mono" fontSize="sm">
                          {arg}
                        </Text>
                      )
                    )}
                  </Stack>
                </Box>
              )}
              {renderTransactionNote(tx)}
              <Text fontSize="sm" color="gray.500">
                Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
              </Text>
              {rawDataSection}
            </Stack>
          </CardBody>
        </Card>
      );
    }

    // Asset Transfer
    if (tx.txType === "axfer") {
      return (
        <Card key={tx.id} {...commonCardProps}>
          <CardBody>
            <Stack spacing={4}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="blue" mb={2}>
                    Asset Transfer
                  </Badge>
                  <Text fontFamily="mono" fontSize="sm" color="gray.500">
                    {tx.id}
                  </Text>
                </Box>
                <Text fontWeight="bold">
                  Asset ID: {tx.assetTransferTransaction?.assetId}
                </Text>
              </Flex>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="semibold">From</Text>
                  <Text fontFamily="mono">{tx.sender}</Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold">To</Text>
                  <Text fontFamily="mono">
                    {tx.assetTransferTransaction?.receiver}
                  </Text>
                </Box>
              </SimpleGrid>
              {renderTransactionNote(tx)}
              <Text fontSize="sm" color="gray.500">
                Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
              </Text>
              {rawDataSection}
            </Stack>
          </CardBody>
        </Card>
      );
    }

    // Default Card for other transaction types
    return (
      <Card key={tx.id} {...commonCardProps}>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge mb={2}>{formatTxnType(tx.txType)}</Badge>
                <Text fontFamily="mono" fontSize="sm" color="gray.500">
                  {tx.id}
                </Text>
              </Box>
            </Flex>
            <Divider />
            <Box>
              <Text fontWeight="semibold">From</Text>
              <Text fontFamily="mono">{tx.sender}</Text>
            </Box>
            {renderTransactionNote(tx)}
            <Text fontSize="sm" color="gray.500">
              Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
            </Text>
            {rawDataSection}
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const calculateTotalFees = (transactions: any[]) => {
    return transactions?.reduce((total, tx) => total + Number(tx.fee), 0) || 0;
  };

  if (loading)
    return (
      <Box pt={8}>
        <Text>Loading...</Text>
      </Box>
    );
  if (error)
    return (
      <Box pt={8}>
        <Text color="red.500">{error}</Text>
      </Box>
    );
  if (!block)
    return (
      <Box pt={8}>
        <Text>Block not found</Text>
      </Box>
    );

  console.log(block);

  return (
    <Stack spacing={6} pt={8}>
      <Flex justify="space-between" align="center">
        <Heading size="lg">Block {round}</Heading>
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
                {JSON.stringify(block, blockSerializer, 2)}
              </Code>
            </Box>
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Heading size="md">Block Overview</Heading>
              <Divider />
              <Stat>
                <StatLabel>Round</StatLabel>
                <StatNumber>{round}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Timestamp</StatLabel>
                <StatNumber>
                  {new Date(block.timestamp * 1000).toLocaleString()}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Transactions</StatLabel>
                <StatNumber>{block.transactions?.length || 0}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Total Fees</StatLabel>
                <StatNumber>
                  {(calculateTotalFees(block.transactions) / 1_000_000).toFixed(
                    6
                  )}{" "}
                  VOI
                </StatNumber>
              </Stat>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Heading size="md">Transaction Types</Heading>
              <Divider />
              {block.transactions && block.transactions.length > 0 ? (
                <Box height="300px">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTransactionTypeCounts(block.transactions)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getTransactionTypeCounts(block.transactions).map(
                          (_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Text color="gray.500">No transactions in this block</Text>
              )}
            </Stack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="md">
              Transactions ({block.transactions?.length || 0})
            </Heading>
            <Divider />
            <Stack spacing={4}>
              {block.transactions &&
                (() => {
                  const { groups, ungrouped } = groupTransactions(
                    block.transactions
                  );

                  return (
                    <>
                      {/* Render grouped transactions */}
                      {Object.entries(groups).map(([groupId, txs]) =>
                        renderTransactionGroup(txs, groupId)
                      )}

                      {/* Render ungrouped transactions */}
                      {ungrouped.map((tx) => renderTransaction(tx))}
                    </>
                  );
                })()}
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
};

export default Block;
