import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardBody,
  Stack,
  Text,
  Heading,
  Divider,
  Badge,
  Flex,
  Button,
  Code,
  useColorModeValue,
  SimpleGrid,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { getTransaction } from "../services/algorand";

interface ParsedNote {
  client?: string;
  type?: "u" | "j";
  message?: string;
  raw?: string;
}

const Transaction: React.FC = () => {
  const { txId } = useParams<{ txId: string }>();
  const [transaction, setTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

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

  const renderPaymentDetails = (tx: any) => {
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge colorScheme="green" mb={2}>
                  Payment
                </Badge>
                <Text fontFamily="mono" fontSize="sm" color="gray.500">
                  {tx.id}
                </Text>
              </Box>
              <Text fontWeight="bold">
                {(tx["payment-transaction"].amount / 1_000_000).toFixed(6)} VOI
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
                  {tx["payment-transaction"].receiver}
                </Text>
              </Box>
            </SimpleGrid>
            {tx.note && renderNote(formatNote(tx.note))}
            <Text fontSize="sm" color="gray.500">
              Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
            </Text>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderApplicationCall = (tx: any) => {
    return (
      <Card>
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
                {tx["application-transaction"]["application-id"] || "Create"}
              </Text>
            </Flex>
            <Divider />
            <Box>
              <Text fontWeight="semibold">From</Text>
              <Text fontFamily="mono">{tx.sender}</Text>
            </Box>
            {tx["application-transaction"]["application-args"] && (
              <Box>
                <Text fontWeight="semibold">Application Args</Text>
                <Stack spacing={1}>
                  {tx["application-transaction"]["application-args"].map(
                    (arg: string, index: number) => (
                      <Text key={index} fontFamily="mono" fontSize="sm">
                        {Buffer.from(arg, "base64").toString()}
                      </Text>
                    )
                  )}
                </Stack>
              </Box>
            )}
            {tx.note && renderNote(formatNote(tx.note))}
            <Text fontSize="sm" color="gray.500">
              Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
            </Text>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderAssetTransfer = (tx: any) => {
    return (
      <Card>
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
                Asset ID: {tx["asset-transfer-transaction"]["asset-id"]}
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
                  {tx["asset-transfer-transaction"].receiver}
                </Text>
              </Box>
            </SimpleGrid>
            <Box>
              <Text fontWeight="semibold">Amount</Text>
              <Text>
                {tx["asset-transfer-transaction"].amount.toLocaleString()}
              </Text>
            </Box>
            {tx.note && renderNote(formatNote(tx.note))}
            <Text fontSize="sm" color="gray.500">
              Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
            </Text>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderTransactionDetails = () => {
    if (!transaction) return null;

    switch (transaction["tx-type"]) {
      case "pay":
        return renderPaymentDetails(transaction);
      case "appl":
        return renderApplicationCall(transaction);
      case "axfer":
        return renderAssetTransfer(transaction);
      default:
        return (
          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Box>
                  <Badge>{transaction["tx-type"]}</Badge>
                  <Text fontFamily="mono" fontSize="sm" color="gray.500" mt={2}>
                    {transaction.id}
                  </Text>
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="semibold">From</Text>
                  <Text fontFamily="mono">{transaction.sender}</Text>
                </Box>
                {transaction.note && renderNote(formatNote(transaction.note))}
                <Text fontSize="sm" color="gray.500">
                  Fee: {(Number(transaction.fee) / 1_000_000).toFixed(6)} VOI
                </Text>
              </Stack>
            </CardBody>
          </Card>
        );
    }
  };

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        const response = await getTransaction(txId || "");
        setTransaction(response.transaction);
        setError(null);
      } catch (err) {
        setError("Failed to fetch transaction data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (txId) {
      fetchTransaction();
    }
  }, [txId]);

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
  if (!transaction)
    return (
      <Box pt={8}>
        <Text>Transaction not found</Text>
      </Box>
    );

  return (
    <Stack spacing={6} pt={8}>
      <Flex justify="space-between" align="center">
        <Heading size="lg">Transaction Details</Heading>
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
                {JSON.stringify(transaction, null, 2)}
              </Code>
            </Box>
          </CardBody>
        </Card>
      )}

      {renderTransactionDetails()}
    </Stack>
  );
};

export default Transaction;
