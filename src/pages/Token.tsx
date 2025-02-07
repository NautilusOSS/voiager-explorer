import React, { useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Heading,
  Spinner,
  Badge,
  Flex,
  Image,
  Center,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  IconButton,
  Button,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
  Input,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useBreakpointValue,
  useColorModeValue,
  Icon,
  Select,
  InputGroup,
  InputLeftAddon,
  ButtonGroup,
} from "@chakra-ui/react";
import { indexerClient } from "../services/algorand";
import {
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/react";
import algosdk from "algosdk";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController
);

interface TokenPrice {
  latest_price: string | null;
  earliest_price: string | null;
  percent_change: number | null;
}

interface Token {
  contractId: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  creator: string;
  deleted: number;
  price: string;
  tokenId: string | null;
  verified: number | null;
  mintRound: number;
  globalState: Record<string, any>;
  change_1h: TokenPrice;
  change_24h: TokenPrice;
  change_7d: TokenPrice;
  latest_price: number;
}

interface TokenHolder {
  accountId: string;
  balance: string;
}

interface Transfer {
  transactionId: string;
  contractId: number;
  timestamp: number;
  round: number;
  sender: string;
  receiver: string;
  amount: string;
}

interface TransferFilters {
  user?: string;
  from?: string;
  to?: string;
  minRound?: number;
  maxRound?: number;
  minTimestamp?: number;
  maxTimestamp?: number;
}

interface Pool {
  contractId: number;
  symbolA: string;
  symbolB: string;
  tokAId: string;
  tokBId: string;
  tvlA: string;
  tvlB: string;
  poolBalA: string;
  poolBalB: string;
  tokADecimals: number;
  tokBDecimals: number;
  tvlUSDC: number;
  tvlVOI: number;
}

const Token: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationTime, setCreationTime] = useState<number | null>(null);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [currentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [hasMoreTransfers, setHasMoreTransfers] = useState(true);
  const [transfersPerPage, setTransfersPerPage] = useState(10);
  const [holdersPerPage, setHoldersPerPage] = useState(10);
  const [currentHoldersPage, setCurrentHoldersPage] = useState(1);
  const [currentTransfersPage, setCurrentTransfersPage] = useState(1);
  const [, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<TransferFilters>({});
  const toast = useToast();
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(
    new Set()
  );
  const [transferDetails, setTransferDetails] = useState<{
    [key: string]: any;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHolders, setFilteredHolders] = useState<TokenHolder[]>([]);
  const [priceData, setPriceData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      tension?: number;
      fill?: boolean;
      pointRadius?: number;
      pointHoverRadius?: number;
      borderWidth?: number;
      yAxisID?: string;
      order?: number;
      type?: string;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: "Price (USDC)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        tension: 0.8,
        fill: true,
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
        yAxisID: "y",
        order: 0,
      },
      {
        type: "bar",
        label: "Volume",
        data: [],
        backgroundColor: "rgba(128, 128, 128, 0.2)",
        yAxisID: "y1",
        order: 1,
      },
    ],
  });
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [invertedPrice, setInvertedPrice] = useState(false);
  const [tvlCurrency, setTvlCurrency] = useState<"VOI" | "USDC">("VOI");
  const [chartType, setChartType] = useState<"price" | "tvl">("price");
  const [usdcPool, setUsdcPool] = useState<Pool | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showHoldersTable, setShowHoldersTable] = useState(false);
  const [, setSwapData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"1H" | "24H" | "7D" | "30D">("7D");
  const [chartLoading, setChartLoading] = useState(false);
  const [poolHolders, setPoolHolders] = useState<TokenHolder[]>([]);
  const [poolHoldersLoading, setPoolHoldersLoading] = useState(false);

  // Move breakpoint values to component level
  const legendDisplay = useBreakpointValue({ base: false, sm: true });
  const yAxisTickLimit = useBreakpointValue({ base: 5, md: 8 });
  const xAxisTickLimit = useBreakpointValue({ base: 5, md: 10 });
  const xAxisRotation = useBreakpointValue({ base: 45, md: 0 });

  const formatSupply = (supply: string, decimals: number) => {
    if (
      supply ===
      "115792089237316195423570985008687907853269984665640564039457584007913129639935"
    ) {
      return "\u00A0";
    }
    const num = Number(supply) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    });
  };

  const formatBalance = (balance: string, decimals: number) => {
    const num = Number(balance) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatLargeNumber = (num: number): string => {
    const absNum = Math.abs(num);
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(2) + "B";
    } else if (absNum >= 1e6) {
      return (num / 1e6).toFixed(2) + "M";
    } else if (absNum >= 1e3) {
      return (num / 1e3).toFixed(2) + "K";
    } else {
      return num.toFixed(2);
    }
  };

  const fetchHolders = async (page: number) => {
    try {
      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${id}&limit=${holdersPerPage}&offset=${
          (page - 1) * holdersPerPage
        }`
      );
      const data = await response.json();

      // Filter out zero balances, application address, and sort by balance
      const sortedHolders = data.balances
        .filter(
          (holder: TokenHolder) =>
            Number(holder.balance) > 0 &&
            holder.accountId !== `${algosdk.getApplicationAddress(Number(id))}`
        )
        .sort(
          (a: TokenHolder, b: TokenHolder) =>
            Number(b.balance) - Number(a.balance)
        );

      setHolders(sortedHolders);
      setHasMore(sortedHolders.length === holdersPerPage);
    } catch (err) {
      console.error("Error fetching holders:", err);
    }
  };

  const fetchTransfers = async (page: number) => {
    try {
      const params = new URLSearchParams({
        contractId: id || "",
        limit: transfersPerPage.toString(),
        offset: ((page - 1) * transfersPerPage).toString(),
      });

      // Add optional filters
      if (filters.user) params.append("user", filters.user);
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.minRound)
        params.append("min-round", filters.minRound.toString());
      if (filters.maxRound)
        params.append("max-round", filters.maxRound.toString());
      if (filters.minTimestamp)
        params.append("min-timestamp", filters.minTimestamp.toString());
      if (filters.maxTimestamp)
        params.append("max-timestamp", filters.maxTimestamp.toString());

      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/transfers?${params.toString()}`
      );
      const data = await response.json();

      setTransfers(data.transfers);
      setHasMoreTransfers(data.transfers.length === transfersPerPage);
    } catch (err) {
      console.error("Error fetching transfers:", err);
    }
  };

  const handleFilterChange = (
    filterName: keyof TransferFilters,
    value: string | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value || undefined,
    }));
    setCurrentTransfersPage(1);
  };

  const handleHoldersPerPageChange = (value: number) => {
    setHoldersPerPage(value);
    setCurrentHoldersPage(1);
    fetchHolders(1);
  };

  const handleTransfersPerPageChange = (value: number) => {
    setTransfersPerPage(value);
    setCurrentTransfersPage(1);
    fetchTransfers(1);
  };

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?contractId=${id}&includes=all`
        );
        const data = await response.json();
        const tokenData = data.tokens[0];
        setToken(tokenData);

        // Fetch block info for creation time
        if (tokenData.mintRound) {
          const blockInfo = await indexerClient
            .lookupBlock(tokenData.mintRound)
            .do();
          setCreationTime(blockInfo.timestamp);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching token:", err);
        setError("Failed to fetch token data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchToken();
      fetchHolders(currentPage);
      fetchTransfers(currentPage);
    }
  }, [id, currentPage, holdersPerPage, transfersPerPage]);

  useEffect(() => {
    // Filter holders based on search query
    const filtered = holders.filter((holder) =>
      holder.accountId.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredHolders(filtered);
  }, [searchQuery, holders]);

  const calculatePoolTVL = (pool: Pool) => {
    console.log({ pool, token });
    if (pool.symbolA === "VOI") {
      return Number(pool.tvlA) * 2;
    }
    if (pool.symbolB === "VOI") {
      return Number(pool.tvlB) * 2;
    }
    // either pool symbolA and symbolB are the token
    if (pool.symbolA === token?.symbol) {
      return Number(pool.tvlA) * (currentPrice ?? 1) * 2;
    }
    if (pool.symbolB === token?.symbol) {
      return Number(pool.tvlB) * (currentPrice ?? 1) * 2;
    }
    return 1;
  };

  useEffect(() => {
    const fetchPools = async () => {
      if (!id) return;
      try {
        // First fetch the USDC/VOI pool for price reference
        const usdcPoolResponse = await fetch(
          "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?contractId=395553&includes=all"
        );
        const usdcPoolData = await usdcPoolResponse.json();
        const usdcPool = usdcPoolData.pools[0];
        setUsdcPool(usdcPool);

        // Calculate VOI price
        const voiPrice = Number(usdcPool.poolBalA) / Number(usdcPool.poolBalB);

        // Now fetch the token's pools
        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?tokenId=${id}`
        );
        const data = await response.json();
        // Calculate both TVL values for each pool
        const poolsWithTVL = data.pools.map((pool: Pool) => {
          const tvlVOI = Number(pool.tvlA) + Number(pool.tvlB);
          let tvlUSDC = tvlVOI * voiPrice;

          // If this is the USDC/VOI pool, calculate TVL differently
          if (pool.contractId === 395553) {
            const usdcBalance = Number(pool.poolBalA);
            const voiBalance = Number(pool.poolBalB);
            const poolVoiPrice = usdcBalance / voiBalance;
            tvlUSDC =
              Number(pool.tvlA) * poolVoiPrice +
              Number(pool.tvlB) * poolVoiPrice;
          }

          return {
            ...pool,
            tvlUSDC,
            tvlVOI,
          };
        });

        setPools(poolsWithTVL);
        // Set first pool as default
        if (poolsWithTVL.length > 0) {
          setSelectedPool(poolsWithTVL[0].contractId);
        }
      } catch (error) {
        console.error("Error fetching pools:", error);
      }
    };

    fetchPools();
  }, [id]);

  const getTimeRangeParams = (range: string) => {
    const now = Math.floor(Date.now() / 1000);
    switch (range) {
      case "1H":
        return { start: now - 3600, end: now };
      case "24H":
        return { start: now - 86400, end: now };
      case "7D":
        return { start: now - 604800, end: now };
      case "30D":
        return { start: now - 2592000, end: now };
      default:
        return { start: now - 86400, end: now };
    }
  };

  const fetchPriceData = async () => {
    if (!selectedPool) return;

    try {
      setChartLoading(true);
      const { start, end } = getTimeRangeParams(timeRange);

      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/swaps?contractId=${selectedPool}&min-timestamp=${start}&max-timestamp=${end}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const recentSwaps = data.swaps.slice(0).reverse();
      setSwapData(recentSwaps.slice().reverse());

      if (chartType === "price") {
        const validSwaps = recentSwaps.filter(
          (swap: any) =>
            typeof swap.price === "number" ||
            (typeof swap.price === "string" && !isNaN(Number(swap.price)))
        );

        // Calculate volume for each swap
        const volumes = validSwaps.map((swap: any) => {
          const volume = Number(swap.inBalA || swap.inBalB);
          return volume;
        });

        setPriceData({
          labels: validSwaps.map((swap: any) => swap.timestamp * 1000),
          datasets: [
            {
              label: invertedPrice
                ? `Price (${
                    pools.find((p) => p.contractId === selectedPool)?.symbolB
                  }/${
                    pools.find((p) => p.contractId === selectedPool)?.symbolA
                  })`
                : `Price (${
                    pools.find((p) => p.contractId === selectedPool)?.symbolA
                  }/${
                    pools.find((p) => p.contractId === selectedPool)?.symbolB
                  })`,
              data: validSwaps.map((swap: any) =>
                invertedPrice ? 1 / Number(swap.price) : Number(swap.price)
              ),
              borderColor: "rgb(75, 192, 192)",
              tension: 0.4,
              fill: true,
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 2,
              yAxisID: "y",
              order: 0,
            },
            {
              type: "bar",
              label: "Volume",
              data: volumes,
              backgroundColor: "rgba(128, 128, 128, 0.2)",
              yAxisID: "y1",
              order: 1,
            },
          ],
        });
      } else {
        const voiPrice = usdcPool
          ? Number(usdcPool.poolBalA) / Number(usdcPool.poolBalB)
          : 1;

        const tvlHistory = recentSwaps.map((swap: any) => {
          const totalTvl = calculatePoolTVL({
            ...pools.find((p) => p.contractId === selectedPool)!,
            tvlA: swap.poolBalA,
            tvlB: swap.poolBalB,
          });

          return tvlCurrency === "VOI" ? totalTvl : totalTvl * voiPrice;
        });

        setPriceData({
          labels: recentSwaps.map((swap: any) => swap.timestamp * 1000),
          datasets: [
            {
              label: `TVL (${tvlCurrency})`,
              data: tvlHistory,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.4,
              fill: true,
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 2,
              yAxisID: "y",
              order: 0,
            },
          ],
        });
      }
    } catch (error) {
      console.error("Error fetching price data:", error);
      setSwapData([]);
      setPriceData({
        labels: [],
        datasets: [
          {
            label: "No data available",
            data: [],
            borderColor: "rgb(75, 192, 192)",
            tension: 0.4,
            fill: true,
            backgroundColor: "rgba(75, 192, 192, 0.1)",
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
            yAxisID: "y",
            order: 0,
          },
        ],
      });
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceData();
  }, [selectedPool, pools, invertedPrice, chartType, tvlCurrency, timeRange]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
      position: "top",
    });
  };

  const toggleTransferDetails = async (txId: string) => {
    try {
      if (!transferDetails[txId]) {
        const response = await fetch(
          `https://mainnet-idx.voi.nodely.dev/v2/transactions/${txId}`
        );
        const data = await response.json();
        setTransferDetails((prev) => ({
          ...prev,
          [txId]: data.transaction,
        }));
      }

      setExpandedTransfers((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(txId)) {
          newSet.delete(txId);
        } else {
          newSet.add(txId);
        }
        return newSet;
      });
    } catch (error) {
      console.error("Error fetching transaction details:", error);
    }
  };

  const decodeArc200AppCall = (args: string[]) => {
    if (args.length !== 3) return null;

    try {
      // Decode method selector
      const methodArg = Buffer.from(args[0], "base64").toString();
      if (methodArg !== "2nAluQ==") return null; // Not an arc200_transfer

      // Decode address
      const addressBytes = Buffer.from(args[1], "base64");
      const address = algosdk.encodeAddress(addressBytes);

      // Decode amount
      const amountBytes = Buffer.from(args[2], "base64");
      const amount = BigInt("0x" + Buffer.from(amountBytes).toString("hex"));

      return {
        method: "arc200_transfer",
        to: address,
        amount: amount.toString(),
      };
    } catch (error) {
      console.error("Error decoding ARC200 app call:", error);
      return null;
    }
  };

  const renderTransactionDetails = (txId: string) => {
    const details = transferDetails[txId];
    if (!details) return null;

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

    // Try to decode ARC200 app call
    let arc200Details = null;
    if (details["application-transaction"]?.["application-args"]) {
      arc200Details = decodeArc200AppCall(
        details["application-transaction"]["application-args"]
      );
    }

    return (
      <Box
        mt={4}
        p={4}
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="md"
      >
        <Stack spacing={4}>
          <Flex justify="space-between" align="center">
            <Stack>
              <Badge colorScheme={getBadgeColor(details["tx-type"])}>
                {details["tx-type"].toUpperCase()}
              </Badge>
              <RouterLink to={`/transaction/${txId}`}>
                <Text
                  color="blue.500"
                  fontSize="sm"
                  display="inline-flex"
                  alignItems="center"
                  _hover={{ textDecoration: "underline" }}
                >
                  View Transaction <ExternalLinkIcon mx="2px" />
                </Text>
              </RouterLink>
            </Stack>
            <Text fontSize="sm" color="gray.500">
              Round: {details["confirmed-round"]}
            </Text>
          </Flex>

          {details["payment-transaction"] && (
            <>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    Amount
                  </Text>
                  <Text>
                    {(
                      Number(details["payment-transaction"].amount) / 1_000_000
                    ).toFixed(6)}{" "}
                    VOI
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    Receiver
                  </Text>
                  <Text fontFamily="mono">
                    {details["payment-transaction"].receiver}
                  </Text>
                </Box>
              </SimpleGrid>
            </>
          )}

          {details["application-transaction"] && (
            <>
              <Divider />
              <Box>
                <Text fontWeight="semibold" fontSize="sm">
                  Application ID
                </Text>
                <Text>
                  {details["application-transaction"]["application-id"] ||
                    "Create"}
                </Text>
              </Box>
              {arc200Details ? (
                // Render decoded ARC200 transfer
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    ARC200 Transfer
                  </Text>
                  <Stack spacing={2}>
                    <Flex justify="space-between">
                      <Text fontSize="sm">To:</Text>
                      <Text fontSize="sm" fontFamily="mono">
                        {formatAddress(arc200Details.to)}
                      </Text>
                    </Flex>
                    <Flex justify="space-between">
                      <Text fontSize="sm">Amount:</Text>
                      <Text fontSize="sm">
                        {token &&
                          (
                            Number(arc200Details.amount) /
                            Math.pow(10, token.decimals)
                          ).toFixed(token.decimals)}
                      </Text>
                    </Flex>
                  </Stack>
                </Box>
              ) : (
                // Fallback to raw args display
                details["application-transaction"]["application-args"] && (
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm">
                      Application Args
                    </Text>
                    <Stack spacing={1}>
                      {details["application-transaction"][
                        "application-args"
                      ].map((arg: string, index: number) => (
                        <Text key={index} fontSize="sm" fontFamily="mono">
                          {arg}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                )
              )}
            </>
          )}

          {details["asset-transfer-transaction"] && (
            <>
              <Divider />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    Asset ID
                  </Text>
                  <Text>
                    {details["asset-transfer-transaction"]["asset-id"]}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    Amount
                  </Text>
                  <Text>{details["asset-transfer-transaction"].amount}</Text>
                </Box>
              </SimpleGrid>
            </>
          )}

          <Divider />
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Fee
              </Text>
              <Text>{(Number(details.fee) / 1_000_000).toFixed(6)} VOI</Text>
            </Box>
            <Box>
              <Text fontWeight="semibold" fontSize="sm">
                Time
              </Text>
              <Text>
                {new Date(details["round-time"] * 1000).toLocaleString()}
              </Text>
            </Box>
          </SimpleGrid>
          {/*details.note && (
            <>
              <Divider />
              <Box>
                <Text fontWeight="semibold" fontSize="sm">Note</Text>
                <Text fontSize="sm" fontFamily="mono">
                  {new TextDecoder().decode(details.note)}
                </Text>
              </Box>
            </>
          )*/}
        </Stack>
      </Box>
    );
  };

  const renderListView = () => {
    if (isMobile) {
      return (
        <Stack spacing={4}>
          {transfers.map((transfer) => {
            const amount = token
              ? Number(transfer.amount) / Math.pow(10, token.decimals)
              : 0;
            const isZeroAmount = Number(transfer.amount) === 0;
            const transferType = "Transfer";

            return (
              <Card
                key={transfer.transactionId}
                onClick={() => toggleTransferDetails(transfer.transactionId)}
                cursor="pointer"
                borderWidth="1px"
                borderColor={useColorModeValue("gray.200", "gray.700")}
                bg={useColorModeValue("white", "gray.800")}
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                  borderColor: useColorModeValue("gray.300", "gray.600"),
                }}
                transition="all 0.2s"
              >
                <CardBody>
                  <Stack spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Badge colorScheme="green">{transferType}</Badge>
                      <Text fontSize="sm" color="gray.500">
                        {new Date(transfer.timestamp * 1000).toLocaleString()}
                      </Text>
                    </Flex>
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm">
                        From
                      </Text>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${transfer.sender}`}>
                          <Text color="blue.500">
                            {formatAddress(transfer.sender)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(transfer.sender);
                          }}
                        />
                      </Flex>
                    </Box>
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm">
                        To
                      </Text>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${transfer.receiver}`}>
                          <Text color="blue.500">
                            {formatAddress(transfer.receiver)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(transfer.receiver);
                          }}
                        />
                      </Flex>
                    </Box>
                    <Flex justify="flex-end">
                      <Text fontWeight="semibold">
                        {isZeroAmount
                          ? "-"
                          : amount.toFixed(token?.decimals || 6)}
                      </Text>
                    </Flex>
                  </Stack>
                  <Flex justify="center" mt={2}>
                    <Icon
                      as={
                        expandedTransfers.has(transfer.transactionId)
                          ? ChevronUpIcon
                          : ChevronDownIcon
                      }
                      color="gray.500"
                    />
                  </Flex>
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      );
    }

    return (
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        bg={useColorModeValue("white", "gray.800")}
        overflow="hidden"
      >
        <Table variant="simple">
          <Thead bg={useColorModeValue("gray.50", "gray.700")}>
            <Tr>
              <Th>Time</Th>
              <Th>Type</Th>
              <Th>From</Th>
              <Th>To</Th>
              <Th isNumeric>Amount</Th>
            </Tr>
          </Thead>
          <Tbody>
            {transfers.map((transfer) => {
              const amount = token
                ? Number(transfer.amount) / Math.pow(10, token.decimals)
                : 0;
              const isZeroAmount = Number(transfer.amount) === 0;
              const transferType = "Transfer";
              const isExpanded = expandedTransfers.has(transfer.transactionId);

              return (
                <React.Fragment key={transfer.transactionId}>
                  <Tr
                    onClick={() =>
                      toggleTransferDetails(transfer.transactionId)
                    }
                    cursor="pointer"
                    _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                  >
                    <Td>
                      {new Date(transfer.timestamp * 1000).toLocaleString()}
                    </Td>
                    <Td>
                      <Badge colorScheme="green">{transferType}</Badge>
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${transfer.sender}`}>
                          <Text color="blue.500">
                            {formatAddress(transfer.sender)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(transfer.sender);
                          }}
                        />
                      </Flex>
                    </Td>
                    <Td>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${transfer.receiver}`}>
                          <Text color="blue.500">
                            {formatAddress(transfer.receiver)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(transfer.receiver);
                          }}
                        />
                      </Flex>
                    </Td>
                    <Td isNumeric>
                      {isZeroAmount
                        ? "-"
                        : amount.toFixed(token?.decimals || 6)}
                    </Td>
                  </Tr>
                  {isExpanded && (
                    <Tr>
                      <Td colSpan={5}>
                        {renderTransactionDetails(transfer.transactionId)}
                      </Td>
                    </Tr>
                  )}
                </React.Fragment>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    );
  };

  const renderHoldersView = () => {
    if (isMobile) {
      return (
        <Stack spacing={4}>
          {filteredHolders.map((holder, index) => {
            const balance = token
              ? formatBalance(holder.balance, token.decimals)
              : "0";
            const percentage = token
              ? (
                  (Number(holder.balance) / Number(token.totalSupply)) *
                  100
                ).toFixed(2)
              : "0";
            const rank = (currentHoldersPage - 1) * holdersPerPage + index + 1;

            return (
              <Card
                key={holder.accountId}
                borderWidth="1px"
                borderColor={useColorModeValue("gray.200", "gray.700")}
                bg={useColorModeValue("white", "gray.800")}
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                  borderColor: useColorModeValue("gray.300", "gray.600"),
                }}
                transition="all 0.2s"
              >
                <CardBody>
                  <Stack spacing={3}>
                    <Flex justify="space-between" align="center">
                      <Badge colorScheme="purple">#{rank}</Badge>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${holder.accountId}`}>
                          <Text color="blue.500">
                            {formatAddress(holder.accountId)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(holder.accountId);
                          }}
                        />
                      </Flex>
                    </Flex>
                    <Divider />
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          Balance
                        </Text>
                        <Text fontWeight="semibold">{balance}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          % of Supply
                        </Text>
                        <Text fontWeight="semibold">{percentage}%</Text>
                      </Box>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>
            );
          })}
        </Stack>
      );
    }

    return (
      <Box
        borderWidth="1px"
        borderRadius="lg"
        borderColor={useColorModeValue("gray.200", "gray.700")}
        bg={useColorModeValue("white", "gray.800")}
        overflow="hidden"
      >
        <Table variant="simple">
          <Thead bg={useColorModeValue("gray.50", "gray.700")}>
            <Tr>
              <Th>Rank</Th>
              <Th>Address</Th>
              <Th isNumeric>Balance</Th>
              <Th isNumeric>% of Supply</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredHolders.map((holder, index) => {
              const balance = token
                ? formatBalance(holder.balance, token.decimals)
                : "0";
              const percentage = token
                ? (
                    (Number(holder.balance) / Number(token.totalSupply)) *
                    100
                  ).toFixed(2)
                : "0";
              const rank =
                (currentHoldersPage - 1) * holdersPerPage + index + 1;

              return (
                <Tr key={holder.accountId}>
                  <Td>#{rank}</Td>
                  <Td>
                    <Flex align="center" gap={2}>
                      <RouterLink to={`/account/${holder.accountId}`}>
                        <Text color="blue.500">
                          {formatAddress(holder.accountId)}
                        </Text>
                      </RouterLink>
                      <IconButton
                        aria-label="Copy address"
                        icon={<CopyIcon />}
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(holder.accountId);
                        }}
                      />
                    </Flex>
                  </Td>
                  <Td isNumeric>{balance}</Td>
                  <Td isNumeric>{percentage}%</Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    );
  };

  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch(
        "https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices"
      );
      const data = await response.json();

      // Find matching pool price for this token
      const tokenPrice = data.prices.find(
        (price: any) =>
          (price.symbolA === token?.symbol && price.symbolB === "VOI") ||
          (price.symbolB === token?.symbol && price.symbolA === "VOI")
      );

      if (tokenPrice) {
        // If token is symbolB, invert the price
        const price =
          tokenPrice.symbolB === token?.symbol
            ? 1 / Number(tokenPrice.price)
            : Number(tokenPrice.price);
        setCurrentPrice(price);
      }
    } catch (error) {
      console.error("Error fetching current price:", error);
    }
  };

  useEffect(() => {
    if (token?.symbol) {
      fetchCurrentPrice();
      // Refresh price every 30 seconds
      const interval = setInterval(fetchCurrentPrice, 30000);
      return () => clearInterval(interval);
    }
  }, [token?.symbol]);

  const fetchPoolHolders = async (poolId: number) => {
    if (!poolId) return;

    try {
      setPoolHoldersLoading(true);
      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${poolId}&limit=${holdersPerPage}&offset=0`
      );
      const data = await response.json();

      // Filter out zero balances and sort by balance
      const sortedHolders = data.balances
        .filter(
          (holder: TokenHolder) =>
            Number(holder.balance) > 0 &&
            holder.accountId !== `${algosdk.getApplicationAddress(poolId)}`
        )
        .sort(
          (a: TokenHolder, b: TokenHolder) =>
            Number(b.balance) - Number(a.balance)
        );

      setPoolHolders(sortedHolders);
    } catch (err) {
      console.error("Error fetching pool holders:", err);
    } finally {
      setPoolHoldersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPool && showHoldersTable) {
      fetchPoolHolders(selectedPool);
    }
  }, [selectedPool, showHoldersTable]);

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error || !token) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500">{error || "Token not found"}</Text>
      </Box>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Card>
          <CardBody>
            <Stack spacing={6}>
              <Flex gap={6} align="flex-start">
                <Box>
                  <Image
                    src={`https://asset-verification.nautilus.sh/icons/${token.contractId}.png`}
                    alt={token.name}
                    boxSize="100px"
                    borderRadius="xl"
                    fallback={
                      <Center boxSize="100px" bg="gray.100" borderRadius="xl">
                        <Text fontSize="3xl">{token.symbol[0]}</Text>
                      </Center>
                    }
                  />
                </Box>
                <Stack flex={1}>
                  <Flex align="center" gap={2}>
                    <Heading size="lg">{token.name}</Heading>
                    {token.verified === 1 && (
                      <Badge colorScheme="green">Verified</Badge>
                    )}
                  </Flex>
                  <Badge colorScheme="blue" alignSelf="flex-start">
                    {token.symbol}
                  </Badge>
                  <Text color="gray.500">Contract ID: {token.contractId}</Text>
                </Stack>
              </Flex>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                {currentPrice !== null && (
                  <Stat>
                    <StatLabel>Current Price</StatLabel>
                    <StatNumber>{(1 / currentPrice).toFixed(6)} VOI</StatNumber>
                    {token.change_1h?.percent_change ? (
                      <StatHelpText>
                        <StatArrow
                          type={
                            token.change_1h.percent_change >= 0
                              ? "increase"
                              : "decrease"
                          }
                        />
                        {token.change_1h.percent_change.toFixed(2)}% (24h)
                      </StatHelpText>
                    ) : token.change_24h?.percent_change ? (
                      <StatHelpText>
                        <StatArrow
                          type={
                            token.change_24h.percent_change >= 0
                              ? "increase"
                              : "decrease"
                          }
                        />
                        {token.change_24h.percent_change.toFixed(2)}% (24h)
                      </StatHelpText>
                    ) : null}
                  </Stat>
                )}

                {token.totalSupply !==
                  "115792089237316195423570985008687907853269984665640564039457584007913129639935" && (
                  <Stat>
                    <StatLabel>Total Supply</StatLabel>
                    <StatNumber>
                      {formatSupply(token.totalSupply, token.decimals)}
                    </StatNumber>
                    <StatHelpText>{token.decimals} decimals</StatHelpText>
                  </Stat>
                )}

                {token.mintRound > 0 && (
                  <Stat>
                    <StatLabel>Created</StatLabel>
                    <StatNumber fontSize="md">
                      {creationTime
                        ? new Date(creationTime * 1000).toLocaleString()
                        : `Round ${token.mintRound}`}
                    </StatNumber>
                    <StatHelpText>Round {token.mintRound}</StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>

              {Object.keys(token.globalState).length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Heading size="md" mb={4}>
                      Global State
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {Object.entries(token.globalState).map(([key, value]) => (
                        <Box
                          key={key}
                          p={4}
                          borderWidth="1px"
                          borderRadius="md"
                        >
                          <Text fontWeight="bold">{key}</Text>
                          <Text>{JSON.stringify(value)}</Text>
                        </Box>
                      ))}
                    </SimpleGrid>
                  </Box>
                </>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Tabs
              onChange={(index) => {
                setActiveTab(index);
                if (index === 0) {
                  setCurrentHoldersPage(1);
                  fetchHolders(1);
                } else if (index === 1) {
                  setCurrentTransfersPage(1);
                  fetchTransfers(1);
                }
                // No special action needed for Charts tab yet
              }}
            >
              <TabList mb={4} pb={4}>
                <Tab>Top Holders</Tab>
                <Tab>Transfers</Tab>
                <Tab>Charts</Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <Stack spacing={4}>
                    <Flex justify="space-between" mb={2}>
                      <FormControl maxW="300px">
                        <Input
                          placeholder="Search by address"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          size="sm"
                        />
                      </FormControl>
                      <FormControl maxW="200px">
                        <Select
                          value={holdersPerPage}
                          onChange={(e) =>
                            handleHoldersPerPageChange(Number(e.target.value))
                          }
                          size="sm"
                        >
                          <option value={10}>10 rows</option>
                          <option value={25}>25 rows</option>
                          <option value={50}>50 rows</option>
                          <option value={100}>100 rows</option>
                        </Select>
                      </FormControl>
                    </Flex>
                    {renderHoldersView()}
                    {hasMore && (
                      <Flex justify="center" mt={4}>
                        <Button
                          onClick={() => {
                            const nextPage = currentHoldersPage + 1;
                            setCurrentHoldersPage(nextPage);
                            fetchHolders(nextPage);
                          }}
                          size="sm"
                          colorScheme="blue"
                        >
                          Load More
                        </Button>
                      </Flex>
                    )}
                  </Stack>
                </TabPanel>

                <TabPanel px={0}>
                  <Stack spacing={4}>
                    <Card>
                      <CardBody>
                        <Stack spacing={4}>
                          <Flex
                            justify="space-between"
                            align="center"
                            cursor="pointer"
                            onClick={() =>
                              setIsFilterExpanded(!isFilterExpanded)
                            }
                          >
                            <Flex align="center" gap={2}>
                              <Heading size="sm">Filter Transfers</Heading>
                              {Object.values(filters).some(
                                (value) => value
                              ) && <Badge colorScheme="blue">Active</Badge>}
                            </Flex>
                            <IconButton
                              aria-label={
                                isFilterExpanded
                                  ? "Collapse filters"
                                  : "Expand filters"
                              }
                              icon={
                                isFilterExpanded ? (
                                  <ChevronUpIcon />
                                ) : (
                                  <ChevronDownIcon />
                                )
                              }
                              variant="ghost"
                              size="sm"
                            />
                          </Flex>

                          {isFilterExpanded && (
                            <>
                              <SimpleGrid
                                columns={{ base: 1, md: 2, lg: 3 }}
                                spacing={4}
                              >
                                <FormControl>
                                  <FormLabel>User Address</FormLabel>
                                  <Input
                                    placeholder="Search any address"
                                    value={filters.user || ""}
                                    onChange={(e) =>
                                      handleFilterChange("user", e.target.value)
                                    }
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>From Address</FormLabel>
                                  <Input
                                    placeholder="Search sender address"
                                    value={filters.from || ""}
                                    onChange={(e) =>
                                      handleFilterChange("from", e.target.value)
                                    }
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>To Address</FormLabel>
                                  <Input
                                    placeholder="Search receiver address"
                                    value={filters.to || ""}
                                    onChange={(e) =>
                                      handleFilterChange("to", e.target.value)
                                    }
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Min Round</FormLabel>
                                  <NumberInput
                                    min={0}
                                    value={filters.minRound || ""}
                                    onChange={(_, val) =>
                                      handleFilterChange("minRound", val)
                                    }
                                  >
                                    <NumberInputField placeholder="Enter minimum round" />
                                    <NumberInputStepper>
                                      <NumberIncrementStepper />
                                      <NumberDecrementStepper />
                                    </NumberInputStepper>
                                  </NumberInput>
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Max Round</FormLabel>
                                  <NumberInput
                                    min={0}
                                    value={filters.maxRound || ""}
                                    onChange={(_, val) =>
                                      handleFilterChange("maxRound", val)
                                    }
                                  >
                                    <NumberInputField placeholder="Enter maximum round" />
                                    <NumberInputStepper>
                                      <NumberIncrementStepper />
                                      <NumberDecrementStepper />
                                    </NumberInputStepper>
                                  </NumberInput>
                                </FormControl>
                              </SimpleGrid>
                              <Flex gap={2} justify="flex-end">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setFilters({});
                                    setCurrentTransfersPage(1);
                                    fetchTransfers(1);
                                  }}
                                  isDisabled={
                                    !Object.values(filters).some(
                                      (value) => value
                                    )
                                  }
                                >
                                  Clear Filters
                                </Button>
                                <Button
                                  colorScheme="blue"
                                  onClick={() => {
                                    setCurrentTransfersPage(1);
                                    fetchTransfers(1);
                                  }}
                                  isDisabled={
                                    !Object.values(filters).some(
                                      (value) => value
                                    )
                                  }
                                >
                                  Apply Filters
                                </Button>
                              </Flex>
                            </>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>

                    <Flex justify="flex-end" mb={2}>
                      <FormControl maxW="200px">
                        <Select
                          value={transfersPerPage}
                          onChange={(e) =>
                            handleTransfersPerPageChange(Number(e.target.value))
                          }
                          size="sm"
                        >
                          <option value={10}>10 rows</option>
                          <option value={25}>25 rows</option>
                          <option value={50}>50 rows</option>
                          <option value={100}>100 rows</option>
                        </Select>
                      </FormControl>
                    </Flex>

                    {renderListView()}

                    {hasMoreTransfers && (
                      <Flex justify="center" mt={4}>
                        <Button
                          onClick={() => {
                            const nextPage = currentTransfersPage + 1;
                            setCurrentTransfersPage(nextPage);
                            fetchTransfers(nextPage);
                          }}
                          size="sm"
                          colorScheme="blue"
                        >
                          Load More
                        </Button>
                      </Flex>
                    )}
                  </Stack>
                </TabPanel>

                <TabPanel px={0}>
                  <Stack spacing={4}>
                    <Flex justify="space-between" wrap="wrap" gap={4}>
                      <ButtonGroup size="sm" isAttached variant="outline">
                        <Button
                          onClick={() => setChartType("price")}
                          colorScheme={chartType === "price" ? "blue" : "gray"}
                        >
                          Price
                        </Button>
                        <Button
                          onClick={() => setChartType("tvl")}
                          colorScheme={chartType === "tvl" ? "blue" : "gray"}
                        >
                          TVL
                        </Button>
                      </ButtonGroup>

                      <ButtonGroup size="sm" isAttached variant="outline">
                        {["1H", "24H", "7D", "30D"].map((range) => (
                          <Button
                            key={range}
                            onClick={() => setTimeRange(range as any)}
                            colorScheme={timeRange === range ? "blue" : "gray"}
                          >
                            {range}
                          </Button>
                        ))}
                      </ButtonGroup>

                      <ButtonGroup size="sm" spacing={2}>
                        <Button
                          onClick={() => setShowDataTable(!showDataTable)}
                          variant="outline"
                        >
                          {showDataTable ? "Hide Data" : "Show Data"}
                        </Button>
                        <Button
                          onClick={() => setShowHoldersTable(!showHoldersTable)}
                          variant="outline"
                        >
                          {showHoldersTable ? "Hide Holders" : "Show Holders"}
                        </Button>
                      </ButtonGroup>
                    </Flex>

                    <Card>
                      <CardBody>
                        <Stack spacing={4}>
                          <Flex
                            justify="space-between"
                            align="center"
                            direction={{ base: "column", md: "row" }}
                            gap={4}
                          >
                            <Heading size="md">
                              {chartType === "price"
                                ? "Price History"
                                : "TVL History"}
                            </Heading>
                            <Flex
                              gap={4}
                              align="center"
                              direction={{ base: "column", sm: "row" }}
                              width={{ base: "100%", md: "auto" }}
                            >
                              <FormControl
                                width={{ base: "100%", sm: "auto" }}
                                minW={{ sm: "200px" }}
                              >
                                <InputGroup size="sm">
                                  <InputLeftAddon
                                    cursor="pointer"
                                    onClick={() =>
                                      setTvlCurrency((curr) =>
                                        curr === "USDC" ? "VOI" : "USDC"
                                      )
                                    }
                                    _hover={{
                                      bg: useColorModeValue(
                                        "gray.200",
                                        "gray.600"
                                      ),
                                    }}
                                  >
                                    {tvlCurrency}
                                  </InputLeftAddon>
                                  <Select
                                    value={selectedPool || ""}
                                    onChange={(e) =>
                                      setSelectedPool(Number(e.target.value))
                                    }
                                    placeholder="Select pool"
                                    size="sm"
                                  >
                                    {pools.map((pool) => (
                                      <option
                                        key={pool.contractId}
                                        value={pool.contractId}
                                      >
                                        {pool.symbolA}/{pool.symbolB} (TVL:{" "}
                                        {tvlCurrency === "USDC" ? "$" : ""}
                                        {formatLargeNumber(
                                          tvlCurrency === "USDC"
                                            ? pool.tvlUSDC
                                            : pool.tvlVOI
                                        )}{" "}
                                        {tvlCurrency})
                                      </option>
                                    ))}
                                  </Select>
                                </InputGroup>
                              </FormControl>
                              {chartType === "price" && selectedPool && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setInvertedPrice(!invertedPrice)
                                  }
                                  variant="outline"
                                  width={{ base: "100%", sm: "auto" }}
                                >
                                  {invertedPrice
                                    ? `${
                                        pools.find(
                                          (p) => p.contractId === selectedPool
                                        )?.symbolB
                                      } / ${
                                        pools.find(
                                          (p) => p.contractId === selectedPool
                                        )?.symbolA
                                      }`
                                    : `${
                                        pools.find(
                                          (p) => p.contractId === selectedPool
                                        )?.symbolA
                                      } / ${
                                        pools.find(
                                          (p) => p.contractId === selectedPool
                                        )?.symbolB
                                      }`}
                                </Button>
                              )}
                            </Flex>
                          </Flex>
                          <Box
                            height={{ base: "300px", md: "400px" }}
                            width="100%"
                            position="relative"
                          >
                            {chartLoading ? (
                              <Center height="100%">
                                <Spinner size="xl" />
                              </Center>
                            ) : (
                              <Line
                                data={priceData as any}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: "top" as const,
                                      display: legendDisplay,
                                    },
                                    title: {
                                      display: false,
                                    },
                                    tooltip: {
                                      callbacks: {
                                        label: (context) => {
                                          const value = context.raw as number;
                                          if (chartType === "price") {
                                            return `${
                                              context.dataset.label
                                            }: ${Number(value).toFixed(6)}`;
                                          }
                                          return `${
                                            context.dataset.label
                                          }: ${formatLargeNumber(value)}`;
                                        },
                                      },
                                    },
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: false,
                                      position: "left",
                                      grid: {
                                        display: true,
                                        color: "rgba(0, 0, 0, 0.1)",
                                      },
                                      ticks: {
                                        maxTicksLimit: yAxisTickLimit,
                                        callback: (value) => {
                                          if (chartType === "price") {
                                            return Number(value) < 0.01
                                              ? Number(value).toExponential(2)
                                              : Number(value).toFixed(6);
                                          }
                                          return formatLargeNumber(
                                            Number(value)
                                          );
                                        },
                                      },
                                    },
                                    y1: {
                                      position: "right",
                                      grid: {
                                        display: false,
                                      },
                                      ticks: {
                                        maxTicksLimit: yAxisTickLimit,
                                        callback: (value) =>
                                          formatLargeNumber(Number(value)),
                                      },
                                    },
                                    x: {
                                      grid: {
                                        display: false,
                                      },
                                      ticks: {
                                        maxTicksLimit: xAxisTickLimit,
                                        maxRotation: xAxisRotation,
                                        callback: (value) => {
                                          const date = new Date(Number(value));
                                          return date.toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          });
                                        },
                                      },
                                    },
                                  },
                                  interaction: {
                                    intersect: false,
                                    mode: "index",
                                  },
                                  elements: {
                                    line: {
                                      tension: 0.4,
                                    },
                                  },
                                }}
                              />
                            )}
                          </Box>

                          {showHoldersTable && (
                            <Box overflowX="auto">
                              <Flex
                                justify="space-between"
                                align="center"
                                mb={4}
                              >
                                <Heading size="sm">Pool Holders</Heading>
                                {poolHoldersLoading && <Spinner size="sm" />}
                              </Flex>
                              <Table variant="simple" size="sm">
                                <Thead>
                                  <Tr>
                                    <Th>Rank</Th>
                                    <Th>Address</Th>
                                    <Th isNumeric>LP Balance</Th>
                                    <Th isNumeric>Share</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {poolHolders.map((holder, index) => {
                                    const totalSupply = poolHolders.reduce(
                                      (sum, h) => sum + Number(h.balance),
                                      0
                                    );
                                    const share = (
                                      (Number(holder.balance) / totalSupply) *
                                      100
                                    ).toFixed(2);

                                    return (
                                      <Tr key={holder.accountId}>
                                        <Td>#{index + 1}</Td>
                                        <Td>
                                          <Flex align="center" gap={2}>
                                            <RouterLink
                                              to={`/account/${holder.accountId}`}
                                            >
                                              <Text color="blue.500">
                                                {formatAddress(
                                                  holder.accountId
                                                )}
                                              </Text>
                                            </RouterLink>
                                            <IconButton
                                              aria-label="Copy address"
                                              icon={<CopyIcon />}
                                              size="xs"
                                              variant="ghost"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(holder.accountId);
                                              }}
                                            />
                                          </Flex>
                                        </Td>
                                        <Td isNumeric>
                                          {formatBalance(holder.balance, 6)}
                                        </Td>
                                        <Td isNumeric>{share}%</Td>
                                      </Tr>
                                    );
                                  })}
                                </Tbody>
                              </Table>
                            </Box>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
};

export default Token;
