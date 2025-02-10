import React, { useEffect, useState } from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Link,
  IconButton,
  useColorModeValue,
  Flex,
  Text,
  Select,
  Button,
  HStack,
  Stack,
  useBreakpointValue,
  Card,
  CardBody,
  SimpleGrid,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Skeleton,
} from "@chakra-ui/react";
import { formatDistanceToNow } from "date-fns";
import { shortenAddress } from "../utils/formatting";
import { InfoIcon, ViewIcon } from "@chakra-ui/icons";

interface ApiSwapTransaction {
  transactionId: string;
  contractId: number;
  timestamp: number;
  round: number;
  symbolA: string;
  symbolB: string;
  poolBalA: number;
  poolBalB: number;
  price: number;
  inBalA: number;
  inBalB: number;
  outBalA: number;
  outBalB: number;
}

interface SwapTransaction {
  timestamp: number;
  txId: string;
  round: number;
  symbolA: string;
  symbolB: string;
  poolBalA: number;
  poolBalB: number;
  price: number;
  inBalA: number;
  inBalB: number;
  outBalA: number;
  outBalB: number;
}

interface Props {
  contractId: string;
}

const formatUTCTimestamp = (timestamp: number) => {
  // Convert seconds to milliseconds
  const date = new Date(timestamp * 1000);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  const ampm = parseInt(hours) >= 12 ? "PM" : "AM";

  return `${formatDistanceToNow(date, {
    addSuffix: true,
  })} (${month}-${day}-${year} ${hours}:${minutes}:${seconds} ${ampm} +UTC)`;
};

const SwapTransactionsTable: React.FC<Props> = ({ contractId }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [transactions, setTransactions] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedSwap, setSelectedSwap] = useState<SwapTransaction | null>(
    null
  );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1);
  };

  const totalPages = Math.ceil(totalTransactions / rowsPerPage);

  const renderPagination = () => (
    <Box mt={4}>
      <Flex
        justify="space-between"
        align="center"
        px={4}
        direction={{ base: "column", sm: "row" }}
        gap={4}
      >
        <HStack spacing={2} minW="150px">
          <Text
            fontSize="sm"
            display={{ base: "none", sm: "block" }}
            whiteSpace="nowrap"
          >
            Rows per page:
          </Text>
          <Select
            size="sm"
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            width="auto"
            minW="100px"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </Select>
        </HStack>
        <HStack
          spacing={2}
          width={{ base: "100%", sm: "auto" }}
          justify={{ base: "center", sm: "flex-end" }}
          minW="300px"
        >
          <Button
            size="sm"
            onClick={() => handlePageChange(1)}
            isDisabled={page === 1}
            display={{ base: "none", sm: "inline-flex" }}
          >
            First
          </Button>
          <Button
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            isDisabled={page === 1}
          >
            {isMobile ? "←" : "Previous"}
          </Button>
          <Text
            fontSize="sm"
            minW="100px"
            textAlign="center"
            whiteSpace="nowrap"
          >
            {isMobile
              ? `${page}/${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </Text>
          <Button
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            isDisabled={page >= totalPages}
          >
            {isMobile ? "→" : "Next"}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );

  const getSwapDirection = (swap: SwapTransaction) => {
    if (swap.inBalA > 0 && swap.outBalB > 0) {
      return `${swap.symbolA} → ${swap.symbolB}`;
    } else if (swap.inBalB > 0 && swap.outBalA > 0) {
      return `${swap.symbolB} → ${swap.symbolA}`;
    }
    return "-";
  };

  const getSwapRate = (swap: SwapTransaction) => {
    if (swap.inBalA > 0 && swap.outBalB > 0) {
      const rate = swap.outBalB / swap.inBalA;
      return `${rate.toFixed(6)} ${swap.symbolB}/${swap.symbolA}`;
    } else if (swap.inBalB > 0 && swap.outBalA > 0) {
      const rate = swap.outBalA / swap.inBalB;
      return `${rate.toFixed(6)} ${swap.symbolA}/${swap.symbolB}`;
    }
    return "-";
  };

  const handleViewDetails = (swap: SwapTransaction) => {
    setSelectedSwap(swap);
    onOpen();
  };

  const TransactionDetailsModal = () => (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Transaction Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {selectedSwap && (
            <Stack spacing={4}>
              <Box>
                <Text fontWeight="bold">Transaction ID</Text>
                <Link
                  href={`/transaction/${selectedSwap.txId}`}
                  color="blue.500"
                >
                  {selectedSwap.txId}
                </Link>
              </Box>
              <Box>
                <Text fontWeight="bold">Block</Text>
                <Link href={`/block/${selectedSwap.round}`} color="blue.500">
                  {selectedSwap.round}
                </Link>
              </Box>
              <Box>
                <Text fontWeight="bold">Time</Text>
                <Text>{formatUTCTimestamp(selectedSwap.timestamp)}</Text>
              </Box>
              <Box>
                <Text fontWeight="bold">Direction</Text>
                <Badge
                  px={2}
                  py={0.5}
                  borderRadius="md"
                  colorScheme="blue"
                  variant="subtle"
                >
                  {getSwapDirection(selectedSwap)}
                </Badge>
              </Box>
              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontWeight="bold">Input</Text>
                  <Text>
                    {selectedSwap.inBalA > 0
                      ? `${selectedSwap.inBalA.toLocaleString()} ${
                          selectedSwap.symbolA
                        }`
                      : ""}
                    {selectedSwap.inBalB > 0
                      ? `${selectedSwap.inBalB.toLocaleString()} ${
                          selectedSwap.symbolB
                        }`
                      : ""}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Output</Text>
                  <Text>
                    {selectedSwap.outBalA > 0
                      ? `${selectedSwap.outBalA.toLocaleString()} ${
                          selectedSwap.symbolA
                        }`
                      : ""}
                    {selectedSwap.outBalB > 0
                      ? `${selectedSwap.outBalB.toLocaleString()} ${
                          selectedSwap.symbolB
                        }`
                      : ""}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Pool Balance A</Text>
                  <Text>
                    {selectedSwap.poolBalA.toLocaleString()}{" "}
                    {selectedSwap.symbolA}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Pool Balance B</Text>
                  <Text>
                    {selectedSwap.poolBalB.toLocaleString()}{" "}
                    {selectedSwap.symbolB}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Price</Text>
                  <Text>{selectedSwap.price.toFixed(6)}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Swap Rate</Text>
                  <Text>{getSwapRate(selectedSwap)}</Text>
                </Box>
              </SimpleGrid>
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  const LoadingSkeleton = () => (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      borderColor={useColorModeValue("gray.200", "gray.700")}
      bg={useColorModeValue("white", "gray.800")}
      overflowX="auto"
    >
      <Table variant="simple" size="sm">
        <Thead bg={useColorModeValue("gray.50", "gray.700")}>
          <Tr>
            <Th w="40px" px={2}></Th>
            <Th px={3}>Transaction</Th>
            <Th px={3}>Direction</Th>
            <Th px={3}>Block</Th>
            <Th px={3}>Age</Th>
            <Th px={3} isNumeric>
              In
            </Th>
            <Th px={3} isNumeric>
              Out
            </Th>
            <Th px={3} isNumeric>
              Swap Rate
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {[...Array(10)].map((_, i) => (
            <Tr key={i}>
              <Td px={2}>
                <Skeleton height="24px" width="24px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="120px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="100px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="80px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="100px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="120px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="120px" />
              </Td>
              <Td px={3}>
                <Skeleton height="20px" width="120px" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  useEffect(() => {
    const fetchSwaps = async () => {
      try {
        setLoading(true);

        // Add delay promise
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/swaps?contractId=${contractId}&limit=${rowsPerPage}&offset=${
            (page - 1) * rowsPerPage
          }`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch swap data");
        }
        const data = await response.json();
        setTotalTransactions(data.total);

        const transformedData: SwapTransaction[] = data.swaps.map(
          (swap: ApiSwapTransaction) => ({
            timestamp: swap.timestamp,
            txId: swap.transactionId,
            round: swap.round,
            symbolA: swap.symbolA,
            symbolB: swap.symbolB,
            poolBalA: swap.poolBalA,
            poolBalB: swap.poolBalB,
            price: swap.price,
            inBalA: swap.inBalA,
            inBalB: swap.inBalB,
            outBalA: swap.outBalA,
            outBalB: swap.outBalB,
          })
        );

        setTransactions(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSwaps();
  }, [contractId, page, rowsPerPage]);

  if (loading) {
    return (
      <Box>
        <LoadingSkeleton />
        {renderPagination()}
      </Box>
    );
  }

  if (!transactions.length) {
    return (
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        bg={useColorModeValue("white", "gray.800")}
        p={8}
      >
        <Flex direction="column" align="center" justify="center" gap={4}>
          <InfoIcon boxSize={10} color="gray.400" />
          <Text color="gray.500" fontSize="lg" textAlign="center">
            No swap transactions found
          </Text>
        </Flex>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Stack spacing={4}>
        {transactions.map((swap) => (
          <Card
            key={swap.txId}
            borderWidth="1px"
            borderRadius="lg"
            borderColor={useColorModeValue("gray.200", "gray.700")}
            bg={useColorModeValue("white", "gray.800")}
            overflow="hidden"
          >
            <CardBody>
              <Stack spacing={3}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Direction
                  </Text>
                  <Badge
                    px={2}
                    py={1}
                    borderRadius="md"
                    colorScheme="blue"
                    variant="subtle"
                  >
                    {getSwapDirection(swap)}
                  </Badge>
                </Box>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Transaction
                    </Text>
                    <Text>{shortenAddress(swap.txId)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Block
                    </Text>
                    <Text>{swap.round}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Age
                    </Text>
                    <Text>
                      {formatDistanceToNow(new Date(swap.timestamp * 1000), {
                        addSuffix: true,
                        includeSeconds: true,
                      })}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Token A
                    </Text>
                    <Text>{swap.symbolA}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Token B
                    </Text>
                    <Text>{swap.symbolB}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Pool Balance A
                    </Text>
                    <Text>{swap.poolBalA.toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Pool Balance B
                    </Text>
                    <Text>{swap.poolBalB.toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Price
                    </Text>
                    <Text>{swap.price.toFixed(6)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      In
                    </Text>
                    <Text>
                      {swap.inBalA > 0
                        ? `${swap.inBalA.toLocaleString()} ${swap.symbolA}`
                        : ""}
                      {swap.inBalB > 0
                        ? `${swap.inBalB.toLocaleString()} ${swap.symbolB}`
                        : ""}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Out
                    </Text>
                    <Text>
                      {swap.outBalA > 0
                        ? `${swap.outBalA.toLocaleString()} ${swap.symbolA}`
                        : ""}
                      {swap.outBalB > 0
                        ? `${swap.outBalB.toLocaleString()} ${swap.symbolB}`
                        : ""}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Stack>
            </CardBody>
          </Card>
        ))}
        {renderPagination()}
      </Stack>
    );
  }

  return (
    <Box>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        bg={useColorModeValue("white", "gray.800")}
        overflowX="auto"
      >
        <Table variant="simple" size="sm">
          <Thead bg={useColorModeValue("gray.50", "gray.700")}>
            <Tr>
              <Th w="40px" px={2}>
                <InfoIcon boxSize={3} />
              </Th>
              <Th px={3}>Transaction</Th>
              <Th px={3}>Direction</Th>
              <Th px={3}>Block</Th>
              <Th px={3}>Age</Th>
              <Th px={3} isNumeric>
                In
              </Th>
              <Th px={3} isNumeric>
                Out
              </Th>
              <Th px={3} isNumeric>
                Swap Rate
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {transactions.map((swap) => (
              <Tr key={swap.txId}>
                <Td px={2}>
                  <IconButton
                    aria-label="View transaction details"
                    icon={<ViewIcon boxSize={4} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => handleViewDetails(swap)}
                  />
                </Td>
                <Td whiteSpace="nowrap" px={3}>
                  <Link href={`/transaction/${swap.txId}`} color="blue.500">
                    {shortenAddress(swap.txId)}
                  </Link>
                </Td>
                <Td whiteSpace="nowrap" px={3}>
                  <Badge
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    colorScheme="blue"
                    variant="subtle"
                    fontSize="xs"
                  >
                    {getSwapDirection(swap)}
                  </Badge>
                </Td>
                <Td whiteSpace="nowrap" px={3}>
                  <Link href={`/block/${swap.round}`} color="blue.500">
                    {swap.round}
                  </Link>
                </Td>
                <Td whiteSpace="nowrap" px={3}>
                  {formatDistanceToNow(new Date(swap.timestamp * 1000), {
                    addSuffix: true,
                    includeSeconds: true,
                  })}
                </Td>
                <Td whiteSpace="nowrap" px={3} isNumeric>
                  {swap.inBalA > 0
                    ? `${swap.inBalA.toLocaleString()} ${swap.symbolA}`
                    : ""}
                  {swap.inBalB > 0
                    ? `${swap.inBalB.toLocaleString()} ${swap.symbolB}`
                    : ""}
                </Td>
                <Td whiteSpace="nowrap" px={3} isNumeric>
                  {swap.outBalA > 0
                    ? `${swap.outBalA.toLocaleString()} ${swap.symbolA}`
                    : ""}
                  {swap.outBalB > 0
                    ? `${swap.outBalB.toLocaleString()} ${swap.symbolB}`
                    : ""}
                </Td>
                <Td whiteSpace="nowrap" px={3} isNumeric>
                  {getSwapRate(swap)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {renderPagination()}
      <TransactionDetailsModal />
    </Box>
  );
};

export default SwapTransactionsTable;
