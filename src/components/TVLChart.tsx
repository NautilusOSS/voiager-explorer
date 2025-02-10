import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Heading,
  FormControl,
  InputGroup,
  InputLeftAddon,
  Select,
  Spinner,
  Center,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";
import { Line } from "react-chartjs-2";
import { enUS } from "date-fns/locale";

interface Pool {
  contractId: number;
  symbolA: string;
  symbolB: string;
  tvlUSDC: number;
  tvlVOI: number;
  tokAId: string;
  tokBId: string;
}

interface SwapData {
  round: number;
  timestamp: string;
  contractId: number;
  assetInId: number;
  assetOutId: number;
  inBalA: number;
  inBalB: number;
  outBalA: number;
  outBalB: number;
  poolBalA: number;
  poolBalB: number;
}

interface SwapDataWithTVL extends SwapData {
  tvl: number;
}

interface TVLChartProps {
  tokenId: string;
  pools: Pool[];
  selectedPool: number | null;
  setSelectedPool: (poolId: number) => void;
  tvlCurrency: "VOI" | "USDC";
  setTvlCurrency: (currency: "VOI" | "USDC") => void;
  timeRange: string;
  showDataTable: boolean;
  showHoldersTable: boolean;
  usdcPool: Pool | null;
  price: number;
  usdPrice: number;
}

const TVLChart: React.FC<TVLChartProps> = ({
  tokenId,
  pools,
  selectedPool,
  setSelectedPool,
  tvlCurrency,
  setTvlCurrency,
  timeRange,
  price,
  usdPrice,
}) => {
  console.log({ price, tokenId, usdPrice });

  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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

  // Add this helper function for calculating moving average
  const calculateMovingAverage = (data: SwapDataWithTVL[], window: number) => {
    return data.map((_, index, array) => {
      const start = Math.max(0, index - window + 1);
      const values = array.slice(start, index + 1).map((d) => d.tvl);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return {
        timestamp: array[index].timestamp,
        tvl: avg,
      };
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        position: "nearest",
        callbacks: {
          label: (context: any) => {
            const value = context.raw.y;
            return `TVL: ${
              tvlCurrency === "USDC" ? "$" : ""
            }${formatLargeNumber(value)} ${tvlCurrency}`;
          },
          title: (tooltipItems: any[]) => {
            const timestamp = new Date(tooltipItems[0].raw.x);
            return timestamp.toLocaleString();
          },
        },
      },
    },
    scales: {
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
            minute: "MMM d, HH:mm",
            hour: "MMM d, HH:mm",
            day: "MMM d, yyyy",
          },
          tooltipFormat: "MMM d, yyyy HH:mm",
        },
        adapters: {
          date: {
            locale: enUS,
          },
        },
        title: {
          display: true,
          text: "Time",
          padding: { top: 10 },
          color: useColorModeValue("#1A202C", "#A0AEC0"),
          font: {
            size: 14,
            weight: "bold",
          },
        },
        ticks: {
          color: useColorModeValue("#1A202C", "#A0AEC0"),
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number) => formatLargeNumber(value),
        },
        suggestedMin: (context: any) => {
          const values = context.chart.data.datasets[0].data.map(
            (d: any) => d.y
          );
          const min = Math.min(...values);
          return min - min * 0.1; // Increased padding
        },
        suggestedMax: (context: any) => {
          const values = context.chart.data.datasets[0].data.map(
            (d: any) => d.y
          );
          const max = Math.max(...values);
          return max + max * 0.1; // Increased padding
        },
      },
    },
    elements: {
      line: {
        cubicInterpolationMode: "monotone",
      },
    },
  };

  const fetchTVLData = async () => {
    if (!selectedPool) return;

    try {
      setLoading(true);
      // Calculate minTimestamp based on timeRange
      const now = new Date();
      let minTimestamp = new Date();

      switch (timeRange) {
        case "1H":
          minTimestamp.setHours(now.getHours() - 1);
          break;
        case "24H":
          minTimestamp.setDate(now.getDate() - 1);
          break;
        case "7D":
          minTimestamp.setDate(now.getDate() - 7);
          break;
        case "30D":
          minTimestamp.setDate(now.getDate() - 30);
          break;
        default:
          minTimestamp.setDate(now.getDate() - 7); // Default to 7 days
      }

      const pool = pools.find((p) => p.contractId === selectedPool);

      console.log({ pool });

      const uri = `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/swaps?contractId=${selectedPool}&min-timestamp=${Math.floor(
        minTimestamp.getTime() / 1000
      )}&max-timestamp=${Math.floor(now.getTime() / 1000)}`;
      const response = await fetch(uri);
      const data = await response.json();
      console.log({ uri, data });

      // Process the swap data
      const processedData = data.swaps.map((swap: SwapData) => ({
        ...swap,
        timestamp: new Date(Number(swap.timestamp) * 1000).toISOString(), // Convert seconds to milliseconds
        tvl:
          pool?.tokAId === tokenId
            ? (swap.poolBalA / price) * 2
            : (swap.poolBalB / price) * 2,
      }));

      // Apply moving average smoothing
      const windowSize = timeRange === "1H" ? 5 : timeRange === "24H" ? 12 : 7;
      const smoothedData = calculateMovingAverage(processedData, windowSize);

      // Update chart data with smoothed values
      setChartData({
        labels: smoothedData.map((d) => d.timestamp),
        datasets: [
          {
            label: "TVL",
            data: smoothedData.map((d) => ({
              x: d.timestamp,
              y: tvlCurrency === "USDC" ? d.tvl * usdPrice : d.tvl,
            })),
            borderColor: "rgb(75, 192, 192)",
            backgroundColor: "rgba(75, 192, 192, 0.1)",
            tension: 0.3,
            fill: true,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching TVL data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTVLData();
  }, [selectedPool, tvlCurrency, timeRange]);

  return (
    <Stack spacing={4}>
      <Flex justify="space-between" align="center">
        <Heading size="md">TVL History</Heading>
        <FormControl maxW="300px">
          <InputGroup size="sm">
            <InputLeftAddon
              cursor="pointer"
              onClick={() =>
                setTvlCurrency(tvlCurrency === "USDC" ? "VOI" : "USDC")
              }
              _hover={{ bg: useColorModeValue("gray.200", "gray.600") }}
            >
              {tvlCurrency}
            </InputLeftAddon>
            <Select
              value={selectedPool || ""}
              onChange={(e) => setSelectedPool(Number(e.target.value))}
              placeholder="Select pool"
              size="sm"
            >
              {pools.map((pool) => (
                <option key={pool.contractId} value={pool.contractId}>
                  {pool.symbolA}/{pool.symbolB} (TVL:{" "}
                  {tvlCurrency === "USDC" ? "$" : ""}
                  {formatLargeNumber(
                    tvlCurrency === "USDC" ? pool.tvlUSDC : pool.tvlVOI
                  )}{" "}
                  {tvlCurrency})
                </option>
              ))}
            </Select>
          </InputGroup>
        </FormControl>
      </Flex>

      <Box height="400px" position="relative">
        {loading ? (
          <Center height="100%">
            <Spinner size="xl" />
          </Center>
        ) : chartData ? (
          <Line data={chartData} options={chartOptions as any} />
        ) : (
          <Center height="100%">No data available</Center>
        )}
      </Box>
    </Stack>
  );
};

export default TVLChart;
