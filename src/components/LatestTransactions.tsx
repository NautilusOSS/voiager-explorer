import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardBody,
  Stack,
  Text,
  Divider,
  Badge,
  Flex,
  SimpleGrid,
} from "@chakra-ui/react";
import { getLatestBlocks } from "../services/algorand";
import algosdk from "algosdk";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  txType: string;
  sender: string;
  fee: number;
  note: Uint8Array;
  round: number;
  index: number;
  paymentTransaction?: {
    amount: number;
    receiver: string;
  };
  applicationTransaction?: {
    applicationId: number;
    applicationArgs?: string[];
  };
  assetTransferTransaction?: {
    amount: number;
    assetId: number;
    receiver: string;
  };
}

interface ParsedNote {
  client?: string;
  type?: "u" | "j";
  message?: string;
  raw?: string;
}

const LatestTransactions: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  console.log({ transactions });

  const [loading, setLoading] = useState(true);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTxnType = (type: string) => {
    return type; //.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  const formatNote = (note: Uint8Array): ParsedNote => {
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

      // Existing format check
      const match = decoded.match(/^([^:]+):([uj])\s(.+)$/);
      if (match) {
        return {
          client: match[1],
          type: match[2] as "u" | "j",
          message: match[3],
          raw: decoded,
        };
      }

      // If no match, return the raw decoded string
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
      <Box>
        {note.client && (
          <Text fontSize="xs" color="gray.500">
            Client: {note.client}
          </Text>
        )}
        <Text fontSize="sm">{note.message || note.raw}</Text>
        {/*note.type === "j" && (
          <Box
            mt={1}
            p={2}
            bg="gray.50"
            borderRadius="md"
            fontSize="xs"
            fontFamily="mono"
            _dark={{ bg: "gray.700" }}
          >
            {note.message}
          </Box>
        )*/}
      </Box>
    );
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

  const handleClick = (round: number, index: number) => {
    navigate(`/block/${round}#tx-${index}`);
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await getLatestBlocks(5); // Get last 5 blocks
        const allTransactions: Transaction[] = [];

        console.log({ response });

        // Extract transactions from each block
        response.blocks.forEach((block) => {
          if (block.block.payset) {
            block.block.payset.forEach((tx: any, index: number) => {
              const txn = tx.signedTxn.signedTxn.txn;
              console.log({ txn });
              allTransactions.push({
                id: "",
                txType: txn.type,
                sender: algosdk.encodeAddress(txn.sender.publicKey),
                fee: Number(txn.fee),
                note: txn.note,
                round: Number(block.block.header.round),
                index: index,
                paymentTransaction:
                  txn.type === "pay"
                    ? {
                        amount: Number(txn.payment.amount),
                        receiver: algosdk.encodeAddress(
                          txn.payment.receiver.publicKey
                        ),
                      }
                    : undefined,
                /*
                applicationTransaction:
                  txn.type === "appl"
                    ? {
                        applicationId: tx.txn.txn.apid,
                        applicationArgs: tx.txn.txn.apaa,
                      }
                    : undefined,
                assetTransferTransaction:
                  txn.type === "axfer"
                    ? {
                        amount: tx.assetTransferTransaction.amount,
                        assetId: tx.txn.txn.xaid,
                        receiver: tx.txn.txn.arcv,
                      }
                    : undefined,
                    */
              });
            });
          }
        });

        // Take the latest 10 transactions
        setTransactions(allTransactions.slice(0, 10));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setLoading(false);
      }
    };

    fetchTransactions();
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderTransaction = (tx: Transaction, index: number) => {
    const parsedNote = formatNote(tx.note);

    // Payment Transaction
    if (tx.txType === "pay" && tx.paymentTransaction) {
      return (
        <Card
          key={index}
          w="100%"
          maxW="100%"
          onClick={() => handleClick(tx.round, tx.index)}
          cursor="pointer"
          _hover={{
            transform: "translateY(-2px)",
            boxShadow: "lg",
          }}
          transition="all 0.2s ease-in-out"
        >
          <CardBody>
            <Stack spacing={4} w="100%">
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="green" mb={2}>
                    Payment
                  </Badge>
                  <Text fontSize="xs" color="gray.500">
                    Index: {tx.index}
                  </Text>
                  {parsedNote && renderNote(parsedNote)}
                </Box>
                <Text fontWeight="bold">
                  {(tx.paymentTransaction.amount / 1_000_000).toFixed(6)} VOI
                </Text>
              </Flex>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="semibold">From</Text>
                  <Text fontFamily="mono">{formatAddress(tx.sender)}</Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold">To</Text>
                  <Text fontFamily="mono">
                    {formatAddress(tx.paymentTransaction.receiver)}
                  </Text>
                </Box>
              </SimpleGrid>
              <Text fontSize="sm" color="gray.500">
                Fee: {(tx.fee / 1_000_000).toFixed(6)} VOI
              </Text>
            </Stack>
          </CardBody>
        </Card>
      );
    }

    // Default Card for other transaction types
    return (
      <Card
        key={index}
        w="100%"
        maxW="100%"
        onClick={() => handleClick(tx.round, tx.index)}
        cursor="pointer"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: "lg",
        }}
        transition="all 0.2s ease-in-out"
      >
        <CardBody>
          <Stack spacing={4} w="100%">
            <Flex justify="space-between" align="center">
              <Box>
                <Badge colorScheme={getBadgeColor(tx.txType)} mb={2}>
                  {formatTxnType(tx.txType)}
                </Badge>
                <Text fontSize="xs" color="gray.500">
                  Index: {tx.index}
                </Text>
                {parsedNote && renderNote(parsedNote)}
              </Box>
            </Flex>
            <Divider />
            <Box>
              <Text fontWeight="semibold">From</Text>
              <Text fontFamily="mono">{formatAddress(tx.sender)}</Text>
            </Box>
            <Text fontSize="sm" color="gray.500">
              Fee: {(tx.fee / 1_000_000).toFixed(6)} VOI
            </Text>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  if (loading) return <Text>Loading...</Text>;

  if (transactions.length === 0) {
    return (
      <Box w="100%" maxW="1400px" mx="auto">
        <Stack spacing={4} w="100%">
          <Text fontSize="2xl" mb={4}>
            Latest Transactions
          </Text>
          <Card minH="300px">
            <CardBody>
              <Stack
                spacing={4}
                align="center"
                justify="center"
                textAlign="center"
                h="100%"
                py={8}
              >
                <Box
                  fontSize="6xl"
                  opacity={0.3}
                  role="img"
                  aria-label="No transactions"
                >
                  💤
                </Box>
                <Text fontSize="xl" fontWeight="medium">
                  No Recent Transactions
                </Text>
                <Text color="gray.500">
                  The network is taking a quick nap. New transactions will
                  appear here as soon as they happen.
                </Text>
                <Box
                  fontSize="sm"
                  color="gray.500"
                  fontStyle="italic"
                  mt={2}
                  maxW="md"
                >
                  Fun fact: The first Voi transaction was sent on September
                  12th, 2024, marking the launch of the MainNet!
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Box>
    );
  }

  return (
    <Box w="100%" maxW="1400px" mx="auto">
      <Stack spacing={4} w="100%">
        <Text fontSize="2xl" mb={4}>
          Latest Transactions
        </Text>
        <Stack spacing={4} w="100%">
          {transactions.map((tx, index) => renderTransaction(tx, index))}
        </Stack>
      </Stack>
    </Box>
  );
};

export default LatestTransactions;
