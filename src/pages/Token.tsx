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
  ButtonGroup,
} from "@chakra-ui/react";
import { indexerClient } from "../services/algorand";
import {
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/react";
import algosdk, { Address } from "algosdk";
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
  TimeScale,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";
import { enUS } from "date-fns/locale";
import TVLChart from "../components/TVLChart";
import PriceLineChart from "../components/PriceLineChart";
import PriceCandleChart from "../components/PriceCandleChart";
import HoldersTable from "../components/HoldersTable";
import SwapTransactionsTable from "../components/SwapTransactionsTable";
import { TOKEN_CONFIGS } from "../constants/tokens";
import PoolInfo from "../components/PoolInfo";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CandlestickController,
  CandlestickElement,
  TimeScale
);

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
  change_1h: {
    latest_price: string | null;
    earliest_price: string | null;
    percent_change: number | null;
  };
  change_24h: {
    latest_price: string | null;
    earliest_price: string | null;
    percent_change: number | null;
  };
  change_7d: {
    latest_price: string | null;
    earliest_price: string | null;
    percent_change: number | null;
  };
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

// Add new interface for advertisement visibility
interface AdvertisementConfig {
  showAds: boolean;
}

const Token: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationTime, setCreationTime] = useState<number | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [hasMoreTransfers, setHasMoreTransfers] = useState(true);
  const [transfersPerPage, setTransfersPerPage] = useState(10);
  const [currentTransfersPage, setCurrentTransfersPage] = useState(1);
  const [activeTab, setActiveTab] = useState(0);
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
  const [priceData, setPriceData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: { x: number; y: number }[];
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
      barPercentage?: number;
      categoryPercentage?: number;
      segment?: {
        borderColor: (context: any) => string;
      };
      borderJoinStyle?: string;
      borderCapStyle?: string;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: "Price (USDC)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        tension: 1,
        fill: true,
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        pointRadius: 1,
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
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPool, setSelectedPool] = useState<number | null>(null);
  const [invertedPrice, setInvertedPrice] = useState(false);
  const [tvlCurrency, setTvlCurrency] = useState<"VOI" | "USDC">("VOI");
  const [chartType, setChartType] = useState<"price" | "tvl">("price");
  const [usdcPool, setUsdcPool] = useState<any | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [currentUsdPrice, setCurrentUsdPrice] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState(false);
  const [showHoldersTable, setShowHoldersTable] = useState(false);
  const [, setSwapData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<"1H" | "24H" | "7D" | "30D">("7D");
  const [, setChartLoading] = useState(false);
  const [, setPoolHolders] = useState<TokenHolder[]>([]);
  const [, setPoolHoldersLoading] = useState(false);
  const [chartStyle, setChartStyle] = useState<"line" | "candle">("candle");
  const [holdersPerPage] = useState(100);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("");
  const [swapDirection, setSwapDirection] = useState<"AtoB" | "BtoA">("AtoB");

  // Move breakpoint values to component level
  const legendDisplay = useBreakpointValue({ base: false, sm: true });
  const yAxisTickLimit = useBreakpointValue({ base: 5, md: 8 });
  const xAxisTickLimit = useBreakpointValue({ base: 5, md: 10 });
  const xAxisRotation = useBreakpointValue({ base: 45, md: 0 });

  // Add advertisement configuration
  const [adConfig] = useState<AdvertisementConfig>({
    showAds: false, // Set this to true to enable ads
  });

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
      fetchTransfers(currentTransfersPage);
    }
  }, [id, currentTransfersPage, transfersPerPage]);

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
        const poolsWithTVL = data.pools.map((pool: any) => {
          const tvlVOI = Number(pool.tvl);
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

  const aggregateVolumeData = (swaps: any[], timeRange: string) => {
    const bucketSize =
      timeRange === "1H"
        ? 60 // 1 minute
        : timeRange === "24H"
        ? 900 // 15 minutes
        : timeRange === "7D"
        ? 3600 // 1 hour
        : 14400; // 4 hours for 30D

    const volumeBuckets = new Map();

    swaps.forEach((swap) => {
      const bucketTime =
        Math.floor(swap.timestamp / bucketSize) * bucketSize * 1000;
      const isAtoB = Number(swap.inBalA) > 0;
      const volume = isAtoB ? Number(swap.inBalA) : Number(swap.inBalB);

      if (volumeBuckets.has(bucketTime)) {
        volumeBuckets.set(bucketTime, volumeBuckets.get(bucketTime) + volume);
      } else {
        volumeBuckets.set(bucketTime, volume);
      }
    });

    return Array.from(volumeBuckets.entries()).map(([time, volume]) => ({
      x: time,
      y: volume,
    }));
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

      if (chartType === "tvl") {
        const bucketSize =
          timeRange === "1H"
            ? 60
            : timeRange === "24H"
            ? 900
            : timeRange === "7D"
            ? 3600
            : 14400;
        const tvlBuckets = new Map();
        let lastValidTvl = null;

        // First pass: Calculate TVL for each swap
        recentSwaps.forEach((swap: any) => {
          const bucketTime =
            Math.floor(swap.timestamp / bucketSize) * bucketSize * 1000;
          const selectedPoolData = pools.find(
            (p) => p.contractId === selectedPool
          );

          if (selectedPoolData) {
            // Adjust pool balances using correct decimals
            const poolBalA =
              Number(swap.poolBalA) /
              Math.pow(10, selectedPoolData.tokADecimals);
            const poolBalB =
              Number(swap.poolBalB) /
              Math.pow(10, selectedPoolData.tokBDecimals);

            let tvl;
            // If either token is VOI
            if (selectedPoolData.symbolA === "VOI") {
              tvl = poolBalA * 2; // Double the VOI amount for TVL
            } else if (selectedPoolData.symbolB === "VOI") {
              tvl = poolBalB * 2;
            } else {
              // If neither token is VOI, use the token price if available
              tvl = (poolBalA + poolBalB) * (currentPrice ?? 1);
            }

            // Convert to USDC if needed
            const finalTvl =
              tvlCurrency === "USDC"
                ? tvl *
                  (usdcPool
                    ? Number(usdcPool.poolBalA) / Number(usdcPool.poolBalB)
                    : 1)
                : tvl;

            tvlBuckets.set(bucketTime, finalTvl * 1000000); // Multiply by 1M to get actual value
            lastValidTvl = finalTvl * 1000000;
          }
        });

        // Second pass: Fill gaps between data points
        if (lastValidTvl !== null) {
          const times = Array.from(tvlBuckets.keys()).sort((a, b) => a - b);
          for (let i = 0; i < times.length - 1; i++) {
            const currentTime = times[i];
            const nextTime = times[i + 1];

            // Fill gaps between data points
            for (
              let t = currentTime + bucketSize * 1000;
              t < nextTime;
              t += bucketSize * 1000
            ) {
              tvlBuckets.set(t, tvlBuckets.get(currentTime));
            }
          }
        }

        // Convert to arrays and sort by time
        const tvlData = Array.from(tvlBuckets.entries())
          .sort(([a], [b]) => a - b)
          .map(([time, value]) => ({
            x: time,
            y: value,
          }));

        setPriceData({
          labels: tvlData.map((point) => point.x),
          datasets: [
            {
              type: "line",
              label: `TVL (${tvlCurrency})`,
              data: tvlData as any,
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              borderWidth: 2,
              yAxisID: "y",
            },
          ],
        });

        // Update chart options to hide y1 axis for TVL view
        chartOptions.scales.y1.display = false;
      } else {
        const validSwaps = recentSwaps.filter(
          (swap: any) =>
            typeof swap.price === "number" ||
            (typeof swap.price === "string" && !isNaN(Number(swap.price)))
        );

        if (chartStyle === "line") {
          const prices = validSwaps.map((swap: any) => ({
            x: swap.timestamp * 1000,
            y: invertedPrice ? 1 / Number(swap.price) : Number(swap.price),
          }));

          // Use aggregated volumes instead of raw data
          const volumes = aggregateVolumeData(validSwaps, timeRange);

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
                data: prices,
                borderColor: "rgb(75, 192, 192)",
                tension: 0.6,
                fill: true,
                backgroundColor: "rgba(75, 192, 192, 0.1)",
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                yAxisID: "y",
                order: 0,
                //cubicInterpolationMode: "monotone",
                //spanGaps: true,
                segment: {
                  borderColor: (_) => "rgb(75, 192, 192)",
                },
                borderJoinStyle: "round",
                borderCapStyle: "round",
              },
              {
                type: "bar",
                label: "Volume",
                data: volumes as any,
                backgroundColor: "rgba(128, 128, 128, 0.2)",
                yAxisID: "y1",
                order: 1,
                barPercentage: 0.9,
                categoryPercentage: 0.9,
              },
            ],
          });
        } else {
          // Handle candlestick data
          const candleData = generateCandleData(validSwaps);
          setPriceData({
            labels: candleData.map((candle) => candle.x),
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
                data: candleData,
                type: "candlestick",
                yAxisID: "y",
              },
              {
                type: "bar",
                label: "Volume",
                data: candleData.map((candle) => ({
                  x: candle.x,
                  y: Number(candle.v) * 0.1,
                })),
                backgroundColor: "rgba(128, 128, 128, 0.2)",
                yAxisID: "y1",
                order: 1,
                barPercentage: 0.3,
                categoryPercentage: 0.8,
              },
            ],
          });
        }
        chartOptions.scales.y1.display = true; // Show y1 axis for price view
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

    // Update chart options to use formatLargeNumber for y-axis
    chartOptions.scales.y.ticks.callback = (value: any) => {
      if (chartType === "price") {
        return Number(value) < 0.01
          ? Number(value).toExponential(2)
          : Number(value).toFixed(6);
      }
      return formatLargeNumber(Number(value));
    };
  };

  useEffect(() => {
    fetchPriceData();
  }, [
    selectedPool,
    pools,
    invertedPrice,
    chartType,
    tvlCurrency,
    timeRange,
    chartStyle,
  ]);

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
        <Stack spacing={2}>
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
                  transform: "translateY(-1px)",
                  boxShadow: "md",
                  borderColor: useColorModeValue("gray.300", "gray.600"),
                }}
                transition="all 0.2s"
              >
                <CardBody py={2} px={3}>
                  <Stack spacing={2}>
                    <Flex justify="space-between" align="center">
                      <Badge colorScheme="green" fontSize="xs">
                        {transferType}
                      </Badge>
                      <Text fontSize="xs" color="gray.500">
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
        <Table variant="simple" size="sm">
          <Thead bg={useColorModeValue("gray.50", "gray.700")}>
            <Tr>
              <Th py={2}>Time</Th>
              <Th py={2}>Type</Th>
              <Th py={2}>From</Th>
              <Th py={2}>To</Th>
              <Th py={2} isNumeric>
                Amount
              </Th>
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
                    <Td py={2}>
                      {new Date(transfer.timestamp * 1000).toLocaleString()}
                    </Td>
                    <Td py={2}>
                      <Badge colorScheme="green" fontSize="xs">
                        {transferType}
                      </Badge>
                    </Td>
                    <Td py={2}>
                      <Flex align="center" gap={1}>
                        <RouterLink to={`/account/${transfer.sender}`}>
                          <Text color="blue.500" fontSize="sm">
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
                    <Td py={2}>
                      <Flex align="center" gap={1}>
                        <RouterLink to={`/account/${transfer.receiver}`}>
                          <Text color="blue.500" fontSize="sm">
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
                    <Td py={2} isNumeric>
                      {isZeroAmount
                        ? "-"
                        : amount.toFixed(token?.decimals || 6)}
                    </Td>
                  </Tr>
                  {isExpanded && (
                    <Tr>
                      <Td colSpan={5} py={2}>
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
      // set current usd price
      const voiTokenPrice = data.prices.find(
        (price: any) =>
          (price.symbolA === "aUSDC" && price.symbolB === "VOI") ||
          (price.symbolB === "aUSDC" && price.symbolA === "VOI")
      );
      const voiUSDPrice = voiTokenPrice?.price;
      setCurrentUsdPrice(voiUSDPrice);
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

  // Update the generateCandleData function
  const generateCandleData = (swaps: any[]) => {
    const candlePeriod =
      timeRange === "1H"
        ? 60 // 1 minute candles
        : timeRange === "24H"
        ? 900 // 15 minute candles
        : timeRange === "7D"
        ? 3600 // 1 hour candles
        : 14400; // 4 hours for 30D

    const candleMap = new Map();

    // Get the time range
    const firstSwap = swaps[0];
    const lastSwap = swaps[swaps.length - 1];

    if (!firstSwap || !lastSwap) return [];

    // Generate all possible candle timestamps
    const startTime =
      Math.floor(firstSwap.timestamp / candlePeriod) * candlePeriod * 1000;
    const endTime =
      Math.ceil(lastSwap.timestamp / candlePeriod) * candlePeriod * 1000;

    // Initialize all candles in the time range
    for (let time = startTime; time <= endTime; time += candlePeriod * 1000) {
      candleMap.set(time, {
        x: time,
        o: null,
        h: null,
        l: null,
        c: null,
        v: 0,
      });
    }

    // Fill in actual swap data
    swaps.forEach((swap) => {
      const candleTime =
        Math.floor(swap.timestamp / candlePeriod) * candlePeriod * 1000;
      const price = invertedPrice ? 1 / Number(swap.price) : Number(swap.price);
      const volume = Number(swap.inBalA || swap.inBalB);

      const candle = candleMap.get(candleTime);
      if (candle) {
        if (candle.o === null) {
          candle.o = price;
          candle.h = price;
          candle.l = price;
          candle.c = price;
        } else {
          candle.h = Math.max(candle.h, price);
          candle.l = Math.min(candle.l, price);
          candle.c = price;
        }
        candle.v += volume;
      }
    });

    // Convert to array and fill gaps
    const candleArray = Array.from(candleMap.values());
    let lastValidPrice = null;

    for (let i = 0; i < candleArray.length; i++) {
      if (candleArray[i].o === null) {
        // If this is an empty candle, use the last valid price
        if (lastValidPrice !== null) {
          candleArray[i].o = lastValidPrice;
          candleArray[i].h = lastValidPrice;
          candleArray[i].l = lastValidPrice;
          candleArray[i].c = lastValidPrice;
        }
      } else {
        lastValidPrice = candleArray[i].c;
      }
    }

    return candleArray.filter((candle) => candle.o !== null);
  };

  // Calculate suggested range based on data
  const getYAxisRange = (datasets: any[]) => {
    if (chartStyle === "candle") {
      const padding = 0.1;
      const allPrices = datasets[0].data.flatMap((candle: any) => [
        candle.h,
        candle.l,
      ]);
      const min = Math.min(...allPrices);
      const max = Math.max(...allPrices);
      const range = max - min;
      return {
        suggestedMin: Math.max(0, min - range * padding),
        suggestedMax: max + range * padding,
      };
    } else {
      // For line charts, calculate a tighter range
      const prices = datasets[0].data.map((point: any) => point.y);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min;
      const padding = range * 0.05; // Reduce padding to 5% (from 10%)

      return {
        suggestedMin: Math.max(0, min - padding),
        suggestedMax: max + padding,
      };
    }
  };

  // Update chart options when data changes
  useEffect(() => {
    if (priceData.datasets[0]?.data.length) {
      const range = getYAxisRange(priceData.datasets);
      chartOptions.scales.y.min = range.suggestedMin;
      chartOptions.scales.y.max = range.suggestedMax;
    }
  }, [priceData, chartStyle]); // Added chartStyle as dependency

  // Update the chart options
  const chartOptions: any = {
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
        enabled: false,
        external: function (context: any) {
          // Get tooltip element
          const tooltipEl = document.getElementById("chartjs-tooltip");

          // Create tooltip if it doesn't exist
          if (!tooltipEl) {
            const div = document.createElement("div");
            div.id = "chartjs-tooltip";
            div.style.position = "absolute";
            div.style.padding = "8px";
            div.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
            div.style.borderRadius = "4px";
            div.style.color = "white";
            div.style.fontSize = "12px";
            div.style.pointerEvents = "none";
            context.chart.canvas.parentNode.appendChild(div);
          }

          // Hide if no tooltip
          if (context.tooltip.opacity === 0) {
            tooltipEl!.style.opacity = "0";
            return;
          }

          // Set position
          tooltipEl!.style.left = "8px";
          tooltipEl!.style.top = "8px";
          tooltipEl!.style.opacity = "1";

          // Set text
          if (context.tooltip.dataPoints) {
            const dataPoint = context.tooltip.dataPoints[0];
            const selectedPoolData = pools.find(
              (p) => p.contractId === selectedPool
            );
            const poolSymbols = selectedPoolData
              ? `${selectedPoolData.symbolA}/${selectedPoolData.symbolB}`
              : "";

            if (chartType === "tvl") {
              // TVL chart tooltip
              tooltipEl!.innerHTML = `
                <div>
                  <div>${poolSymbols} - ${new Date(
                dataPoint.raw.x
              ).toLocaleString()}</div>
                  <div>TVL: ${
                    tvlCurrency === "USDC" ? "$" : ""
                  }${formatLargeNumber(dataPoint.raw.y)} ${tvlCurrency}</div>
                </div>
              `;
            } else if (chartStyle === "candle") {
              // Existing candlestick tooltip
              const candleData = dataPoint.raw;
              const volumeData = context.tooltip.dataPoints[1]?.raw?.y;
              const isUp = Number(candleData.c) >= Number(candleData.o);
              const candleColor = isUp
                ? "rgb(75, 192, 192)"
                : "rgb(255, 99, 132)";

              tooltipEl!.innerHTML = `
                <div>
                  <div>${poolSymbols} - ${new Date(
                candleData.x
              ).toLocaleString()}</div>
                  <div>O<span style="color: ${candleColor}">${Number(
                candleData.o
              ).toFixed(
                6
              )}</span> | H<span style="color: ${candleColor}">${Number(
                candleData.h
              ).toFixed(
                6
              )}</span> | L<span style="color: ${candleColor}">${Number(
                candleData.l
              ).toFixed(
                6
              )}</span> | C<span style="color: ${candleColor}">${Number(
                candleData.c
              ).toFixed(6)}</span></div>
                  ${
                    volumeData
                      ? `<div>Vol <span style="color: ${candleColor}">${formatLargeNumber(
                          volumeData
                        )}</span></div>`
                      : ""
                  }
                </div>
              `;
            } else {
              // Existing line chart tooltip
              const price = dataPoint.raw.y;
              const volumeData = context.tooltip.dataPoints[1]?.raw?.y;
              const volumeColor = "rgba(128, 128, 128, 1)";

              tooltipEl!.innerHTML = `
                <div>
                  <div>${poolSymbols} - ${new Date(
                dataPoint.raw.x
              ).toLocaleString()}</div>
                  <div>Price: ${Number(price).toFixed(6)}</div>
                  ${
                    volumeData
                      ? `<div>Vol <span style="color: ${volumeColor}">${formatLargeNumber(
                          volumeData
                        )}</span></div>`
                      : ""
                  }
                </div>
              `;
            }
          }
        },
      },
      decimation: {
        enabled: true,
        algorithm: "min-max",
        samples: 200, // Increased sample size for smoother curves
      },
    },
    scales: {
      y: {
        position: "left",
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.1)", // Simplified - removed conditional color
          lineWidth: 1, // Simplified - removed conditional width
          drawTicks: true,
          borderDash: [], // Simplified - removed conditional dash
        },
        ticks: {
          maxTicksLimit: yAxisTickLimit,
          callback: (value: any) => {
            if (chartType === "price") {
              return Number(value) < 0.01
                ? Number(value).toExponential(2)
                : Number(value).toFixed(6);
            }
            return formatLargeNumber(Number(value));
          },
        },
        min: 0,
        max: undefined,
        suggestedMin: 0,
        suggestedMax: undefined,
        weight: 100,
        border: {
          display: true,
        },
        beginAtZero: false, // Allow the scale to start at the minimum value
        grace: "5%", // Add small grace percentage for better visibility
      },
      y1: {
        position: "right",
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: yAxisTickLimit,
          callback: (value: any) => formatLargeNumber(Number(value)),
        },
        beginAtZero: true,
        weight: 1,
      },
      x: {
        type: "time",
        time: {
          unit:
            timeRange === "1H"
              ? "minute"
              : timeRange === "24H"
              ? "hour"
              : "day",
          displayFormats: {
            minute: "HH:mm",
            hour: "HH:mm",
            day: "MMM d",
          },
          tooltipFormat: "PPpp", // Add this for better tooltip time formatting
        },
        adapters: {
          date: {
            locale: enUS, // Make sure to import from date-fns
          },
        },
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.1)",
          lineWidth: 1,
        },
        ticks: {
          maxTicksLimit: xAxisTickLimit,
          maxRotation: xAxisRotation,
          source: "auto",
          autoSkip: true,
        },
        offset: false, // Set to false for line charts
      },
    },
    layout: {
      padding: {
        top: 10, // Reduce from 20
        bottom: 0,
        left: 0, // Add left padding
        right: 10, // Add right padding for y-axis labels
      },
    },
    interaction: {
      intersect: false,
      mode: "nearest",
      axis: "x",
    },
    hover: {
      mode: "index",
      intersect: false,
    },
    elements: {
      candlestick: {
        color: {
          up: "rgba(75, 192, 192, 1)",
          down: "rgba(255, 99, 132, 1)",
          unchanged: "rgba(75, 192, 192, 1)", // Changed from gray to green
        },
        borderColor: {
          up: "rgba(75, 192, 192, 1)",
          down: "rgba(255, 99, 132, 1)",
          unchanged: "rgba(75, 192, 192, 1)", // Changed from gray to green
        },
        wick: {
          color: {
            up: "rgba(75, 192, 192, 1)",
            down: "rgba(255, 99, 132, 1)",
            unchanged: "rgba(75, 192, 192, 1)", // Changed from gray to green
          },
        },
      },
      line: {
        tension: 0.6, // Match dataset tension
        cubicInterpolationMode: "monotone",
        stepped: false,
        borderJoinStyle: "round",
        borderCapStyle: "round",
      },
    },
    animations: {
      tension: {
        duration: 1000,
        easing: "linear",
        from: 0.8,
        to: 0.6,
        loop: false,
      },
    },
  };

  // Add cleanup for tooltip element when component unmounts
  useEffect(() => {
    return () => {
      const tooltipEl = document.getElementById("chartjs-tooltip");
      if (tooltipEl) {
        tooltipEl.remove();
      }
    };
  }, []);

  // Add new effect to handle initial pool selection and data fetch
  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0].contractId);
      // No need to call fetchPriceData here as it will be triggered by the selectedPool change
    }
  }, [pools, selectedPool]);

  // Update the tab change handler
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (index === 1) {
      setCurrentTransfersPage(1);
      fetchTransfers(1);
    } else if (index === 2 && selectedPool) {
      fetchPriceData();
    }
  };

  // Add handler for swap direction toggle
  const handleSwapDirection = () => {
    setSwapDirection((prev) => (prev === "AtoB" ? "BtoA" : "AtoB"));
    // Swap the values
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Update the tab change handler to include chart data fetching for initial load
  useEffect(() => {
    if (activeTab === 2 && selectedPool) {
      fetchPriceData();
    }
  }, [activeTab, selectedPool]); // Add activeTab as dependency

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

  console.log("priceData", priceData);

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

        {id && <PoolInfo contractId={id} />}

        {/* First Ad Placement - Top Banner */}
        {adConfig.showAds && (
          <Box
            as="aside"
            p={4}
            borderWidth="1px"
            borderRadius="lg"
            borderStyle="dashed"
            borderColor={useColorModeValue("gray.200", "gray.700")}
            bg={useColorModeValue("gray.50", "gray.800")}
            textAlign="center"
          >
            <Text color="gray.500">Advertisement</Text>
            {/* Add your ad component or code here */}
          </Box>
        )}

        <Card>
          <CardBody>
            <Tabs
              onChange={handleTabChange}
              isFitted
              variant="enclosed"
              defaultIndex={2}
            >
              <TabList mb={4} pb={4}>
                <Tab>Top Holders</Tab>
                <Tab>Transfers</Tab>
                <Tab>Charts</Tab>
              </TabList>

              <TabPanels>
                <TabPanel tabIndex={0} px={0}>
                  {/* Second Ad Placement - Before Holders Table */}
                  {adConfig.showAds && (
                    <Box
                      as="aside"
                      p={4}
                      mb={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderStyle="dashed"
                      borderColor={useColorModeValue("gray.200", "gray.700")}
                      bg={useColorModeValue("gray.50", "gray.800")}
                      textAlign="center"
                    >
                      <Text color="gray.500">Advertisement</Text>
                      {/* Add your ad component here */}
                    </Box>
                  )}

                  {id && (
                    <HoldersTable
                      contractId={id}
                      excludeAddresses={[
                        Address.zeroAddress().toString(),
                        algosdk.getApplicationAddress(Number(id)).toString(),
                        token.creator,
                        ...(TOKEN_CONFIGS[id]?.excludedAddresses || []),
                      ]}
                      distributionAmount={TOKEN_CONFIGS[id]?.distributionAmount}
                    />
                  )}
                </TabPanel>

                <TabPanel tabIndex={1} px={0}>
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

                <TabPanel tabIndex={2} px={0}>
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

                      {chartType === "price" && (
                        <ButtonGroup size="sm" isAttached variant="outline">
                          <Button
                            onClick={() => setChartStyle("line")}
                            colorScheme={
                              chartStyle === "line" ? "blue" : "gray"
                            }
                          >
                            Line
                          </Button>
                          <Button
                            onClick={() => setChartStyle("candle")}
                            colorScheme={
                              chartStyle === "candle" ? "blue" : "gray"
                            }
                          >
                            Candle
                          </Button>
                        </ButtonGroup>
                      )}

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
                        {chartType === "price" && (
                          <>
                            <Button
                              onClick={() => setShowDataTable(!showDataTable)}
                              variant="outline"
                            >
                              {showDataTable ? "Hide Data" : "Show Data"}
                            </Button>
                            <Button
                              onClick={() =>
                                setShowHoldersTable(!showHoldersTable)
                              }
                              variant="outline"
                            >
                              {showHoldersTable
                                ? "Hide Holders"
                                : "Show Holders"}
                            </Button>
                          </>
                        )}
                      </ButtonGroup>
                    </Flex>

                    {/* Third Ad Placement - Before Chart */}
                    {adConfig.showAds && (
                      <Box
                        as="aside"
                        p={4}
                        borderWidth="1px"
                        borderRadius="lg"
                        borderStyle="dashed"
                        borderColor={useColorModeValue("gray.200", "gray.700")}
                        bg={useColorModeValue("gray.50", "gray.800")}
                        textAlign="center"
                      >
                        <Text color="gray.500">Advertisement</Text>
                        {/* Add your ad component here */}
                      </Box>
                    )}

                    <Card>
                      <CardBody
                        bgGradient={useColorModeValue(
                          "linear(to-br, gray.50, white, gray.50)",
                          "linear(to-br, gray.800, gray.900, gray.800)"
                        )}
                        borderRadius="lg"
                      >
                        {chartType === "price" ? (
                          <Stack spacing={4}>
                            <Flex
                              direction={{ base: "column", xl: "row" }}
                              gap={4}
                            >
                              {/* Chart container */}
                              <Box flex={{ base: "1", xl: "3" }}>
                                {chartStyle === "line" ? (
                                  <PriceLineChart
                                    pools={pools}
                                    selectedPool={selectedPool}
                                    setSelectedPool={setSelectedPool}
                                    tvlCurrency={tvlCurrency}
                                    setTvlCurrency={setTvlCurrency}
                                    timeRange={timeRange}
                                    showDataTable={showDataTable}
                                    showHoldersTable={showHoldersTable}
                                    invertedPrice={invertedPrice}
                                    setInvertedPrice={setInvertedPrice}
                                    usdcPool={usdcPool}
                                    currentPrice={currentPrice}
                                  />
                                ) : (
                                  <PriceCandleChart
                                    pools={pools}
                                    selectedPool={selectedPool}
                                    setSelectedPool={setSelectedPool}
                                    tvlCurrency={tvlCurrency}
                                    setTvlCurrency={setTvlCurrency}
                                    timeRange={timeRange}
                                    showDataTable={showDataTable}
                                    showHoldersTable={showHoldersTable}
                                    invertedPrice={invertedPrice}
                                    setInvertedPrice={setInvertedPrice}
                                    usdcPool={usdcPool}
                                    currentPrice={currentPrice}
                                  />
                                )}
                              </Box>

                              {/* Metrics column */}
                              <Stack
                                spacing={2}
                                flex={{ base: "1", xl: "1" }}
                                minW={{ xl: "280px" }}
                              >
                                {/* Add new Symbol info box */}
                                <Box
                                  p={3}
                                  bg={useColorModeValue("white", "gray.800")}
                                  borderRadius="md"
                                  boxShadow="sm"
                                >
                                  <Stack spacing={2}>
                                    <Flex
                                      justify="space-between"
                                      align="center"
                                    >
                                      <Text fontSize="sm" fontWeight="medium">
                                        Symbol
                                      </Text>
                                      <Text fontSize="sm" color="gray.500">
                                        ID: {token.contractId}
                                      </Text>
                                    </Flex>
                                    <Flex
                                      justify="space-between"
                                      align="center"
                                      gap={2}
                                    >
                                      <Text fontSize="lg" fontWeight="bold">
                                        {token.symbol}
                                      </Text>
                                      <ButtonGroup
                                        size="sm"
                                        isAttached
                                        variant="outline"
                                      >
                                        <IconButton
                                          aria-label="Copy Symbol"
                                          icon={<CopyIcon />}
                                          onClick={() =>
                                            handleCopy(token.symbol)
                                          }
                                          size="sm"
                                        />
                                        <IconButton
                                          aria-label="Copy Contract ID"
                                          icon={<CopyIcon />}
                                          onClick={() =>
                                            handleCopy(
                                              token.contractId.toString()
                                            )
                                          }
                                          size="sm"
                                        />
                                      </ButtonGroup>
                                    </Flex>
                                  </Stack>
                                </Box>

                                <Stat
                                  p={3}
                                  bg={useColorModeValue("white", "gray.800")}
                                  borderRadius="md"
                                  boxShadow="sm"
                                >
                                  <StatLabel fontSize="sm">Price</StatLabel>
                                  <Flex align="baseline" gap={2}>
                                    <StatNumber fontSize="lg">
                                      {currentPrice
                                        ? (1 / currentPrice).toFixed(6)
                                        : "-"}{" "}
                                      VOI
                                    </StatNumber>
                                    {currentUsdPrice && (
                                      <StatHelpText margin={0}>
                                        ($
                                        {(
                                          (1 / currentPrice!) *
                                          currentUsdPrice
                                        ).toFixed(4)}
                                        )
                                      </StatHelpText>
                                    )}
                                  </Flex>
                                </Stat>

                                <Stat
                                  p={3}
                                  bg={useColorModeValue("white", "gray.800")}
                                  borderRadius="md"
                                  boxShadow="sm"
                                >
                                  <StatLabel fontSize="sm">TVL</StatLabel>
                                  <Flex align="baseline" gap={2}>
                                    <StatNumber fontSize="lg">
                                      {selectedPool &&
                                      pools.find(
                                        (p) => p.contractId === selectedPool
                                      )?.tvlVOI
                                        ? formatLargeNumber(
                                            pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )!.tvlVOI
                                          )
                                        : "-"}{" "}
                                      VOI
                                    </StatNumber>
                                    {selectedPool &&
                                      pools.find(
                                        (p) => p.contractId === selectedPool
                                      )?.tvlUSDC && (
                                        <StatHelpText margin={0}>
                                          ($
                                          {formatLargeNumber(
                                            pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )!.tvlUSDC
                                          )}
                                          )
                                        </StatHelpText>
                                      )}
                                  </Flex>
                                </Stat>

                                {/*<Stat
                                  p={3}
                                  bg={useColorModeValue("white", "gray.800")}
                                  borderRadius="md"
                                  boxShadow="sm"
                                >
                                  <StatLabel fontSize="sm">
                                    24h Volume
                                  </StatLabel>
                                  <Flex align="baseline" gap={2}>
                                    <StatNumber fontSize="lg">
                                      {selectedPool &&
                                      pools.find(
                                        (p) => p.contractId === selectedPool
                                      )?.volume24h
                                        ? formatLargeNumber(
                                            pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )!.volume24h
                                          )
                                        : "-"}{" "}
                                      VOI
                                    </StatNumber>
                                    {selectedPool &&
                                      pools.find(
                                        (p) => p.contractId === selectedPool
                                      )?.volumeUSD24h && (
                                        <StatHelpText margin={0}>
                                          ($
                                          {formatLargeNumber(
                                            pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )!.volumeUSD24h
                                          )}
                                          )
                                        </StatHelpText>
                                      )}
                                  </Flex>
                                </Stat>*/}

                                {/* Add new swap UI */}
                                <Box
                                  p={3}
                                  bg={useColorModeValue("white", "gray.800")}
                                  borderRadius="md"
                                  boxShadow="sm"
                                >
                                  <Stack spacing={2}>
                                    <FormControl>
                                      <FormLabel fontSize="sm">
                                        From (
                                        {swapDirection === "AtoB"
                                          ? pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )?.symbolA
                                          : pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )?.symbolB}
                                        )
                                      </FormLabel>
                                      <NumberInput
                                        min={0}
                                        value={fromAmount}
                                      >
                                        <NumberInputField placeholder="0.0" />
                                        <NumberInputStepper>
                                          <NumberIncrementStepper />
                                          <NumberDecrementStepper />
                                        </NumberInputStepper>
                                      </NumberInput>
                                    </FormControl>

                                    <Center>
                                      <IconButton
                                        aria-label="Swap tokens"
                                        icon={<RepeatIcon />}
                                        size="sm"
                                        variant="ghost"
                                        transform="rotate(90deg)"
                                        onClick={handleSwapDirection}
                                      />
                                    </Center>

                                    <FormControl>
                                      <FormLabel fontSize="sm">
                                        To (
                                        {swapDirection === "AtoB"
                                          ? pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )?.symbolB
                                          : pools.find(
                                              (p) =>
                                                p.contractId === selectedPool
                                            )?.symbolA}
                                        )
                                      </FormLabel>
                                      <NumberInput
                                        min={0}
                                        value={toAmount}
                                      >
                                        <NumberInputField placeholder="0.0" />
                                        <NumberInputStepper>
                                          <NumberIncrementStepper />
                                          <NumberDecrementStepper />
                                        </NumberInputStepper>
                                      </NumberInput>
                                    </FormControl>

                                    {/*currentUsdPrice && fromAmount && (
                                      <Text
                                        fontSize="sm"
                                        color="gray.500"
                                        textAlign="right"
                                      >
                                        ≈ $
                                        {(
                                          Number(fromAmount) *
                                          (swapDirection === "AtoB"
                                            ? currentPrice!
                                            : 1) *
                                          currentUsdPrice
                                        ).toFixed(2)}
                                      </Text>
                                    )*/}
                                  </Stack>
                                </Box>

                                <Button
                                  colorScheme="blue"
                                  size="md"
                                  leftIcon={<RepeatIcon />}
                                  rightIcon={<ExternalLinkIcon />}
                                  onClick={() =>
                                    window.open(
                                      `https://voi.humble.sh/#/swap?poolId=${selectedPool}`,
                                      "_blank"
                                    )
                                  }
                                  mt={1}
                                >
                                  Trade{" "}
                                  {
                                    pools.find(
                                      (p) => p.contractId === selectedPool
                                    )?.symbolA
                                  }
                                  /
                                  {
                                    pools.find(
                                      (p) => p.contractId === selectedPool
                                    )?.symbolB
                                  }
                                </Button>
                              </Stack>
                            </Flex>

                            {showDataTable && (
                              <Box mt={4}>
                                <Heading size="md" mb={4}>
                                  Transaction History
                                </Heading>
                                {selectedPool && (
                                  <SwapTransactionsTable
                                    contractId={selectedPool.toString()}
                                  />
                                )}
                              </Box>
                            )}
                          </Stack>
                        ) : (
                          <TVLChart
                            tokenId={id || ""}
                            pools={pools}
                            selectedPool={selectedPool}
                            setSelectedPool={setSelectedPool}
                            tvlCurrency={tvlCurrency}
                            setTvlCurrency={setTvlCurrency}
                            timeRange={timeRange}
                            showDataTable={showDataTable}
                            showHoldersTable={showHoldersTable}
                            usdcPool={usdcPool}
                            price={currentPrice || 0}
                            usdPrice={currentUsdPrice || 0}
                          />
                        )}
                      </CardBody>
                    </Card>

                    {/* Add LP Holders Table */}
                    {showHoldersTable && selectedPool && (
                      <Box mt={4}>
                        <Heading size="md" mb={4}>
                          LP Token Holders
                        </Heading>
                        <HoldersTable
                          contractId={selectedPool.toString()}
                          excludeAddresses={[
                            Address.zeroAddress().toString(),
                            algosdk
                              .getApplicationAddress(Number(selectedPool))
                              .toString(),
                            token.creator,
                            ...(TOKEN_CONFIGS[selectedPool.toString()]
                              ?.excludedAddresses || []),
                          ]}
                          distributionAmount={
                            TOKEN_CONFIGS[selectedPool.toString()]
                              ?.distributionAmount
                          }
                        />
                      </Box>
                    )}
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
