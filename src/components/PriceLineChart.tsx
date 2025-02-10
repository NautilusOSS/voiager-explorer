import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  Heading,
  Image,
  InputGroup,
  InputLeftAddon,
  Select,
  Spinner,
  Center,
  useColorModeValue,
  Stack,
} from "@chakra-ui/react";
import { Line } from "react-chartjs-2";

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

interface PriceLineChartProps {
  pools: any[];
  selectedPool: number | null;
  setSelectedPool: (poolId: number) => void;
  tvlCurrency: "VOI" | "USDC";
  setTvlCurrency: (currency: "VOI" | "USDC") => void;
  timeRange: string;
  showDataTable: boolean;
  showHoldersTable: boolean;
  invertedPrice: boolean;
  setInvertedPrice: (inverted: boolean) => void;
  usdcPool: any;
  currentPrice: number | null;
}

const PriceLineChart: React.FC<PriceLineChartProps> = ({
  pools,
  selectedPool,
  setSelectedPool,
  tvlCurrency,
  setTvlCurrency,
  timeRange,
  invertedPrice,
  setInvertedPrice,
}) => {
  const [chartLoading, setChartLoading] = useState(false);
  const [, setSwapData] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any>({
    labels: [],
    datasets: [
      {
        label: "Price",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.1)",
        tension: 0.3,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  });

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

  // Chart options
  const chartOptions: any = {
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
        suggestedMin: (context: any) => {
          const values = context.chart.data.datasets[0].data.map(
            (d: any) => d.y
          );
          const min = Math.min(...values);
          return min - min * 0.1;
        },
        suggestedMax: (context: any) => {
          const values = context.chart.data.datasets[0].data.map(
            (d: any) => d.y
          );
          const max = Math.max(...values);
          return max + max * 0.1;
        },
      },
    },
    elements: {
      line: {
        cubicInterpolationMode: "monotone",
      },
    },
  };

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!selectedPool) return;

      try {
        setChartLoading(true);
        const { start, end } = getTimeRangeParams(timeRange);

        console.log({ start, end });

        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/swaps?contractId=${selectedPool}&min-timestamp=${start}&max-timestamp=${end}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const recentSwaps = data.swaps.slice(0).reverse();
        setSwapData(recentSwaps);

        // Process line chart data
        const prices = recentSwaps.map((swap: any) => ({
          x: swap.timestamp * 1000,
          y: invertedPrice ? 1 / Number(swap.price) : Number(swap.price),
        }));

        setPriceData({
          labels: recentSwaps.map((swap: any) => swap.timestamp * 1000),
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
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              tension: 0.3,
              fill: true,
              pointRadius: 0,
              borderWidth: 2,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching price data:", error);
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
              order: 0,
            },
          ],
        });
      } finally {
        setChartLoading(false);
      }
    };

    fetchPriceData();
  }, [selectedPool, timeRange, invertedPrice, pools]);

  return (
    <Stack spacing={4}>
      <Flex
        justify="space-between"
        align="center"
        direction={{ base: "column", md: "row" }}
        gap={4}
      >
        <Heading size="md">Price History</Heading>
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
          {selectedPool && (
            <Button
              size="sm"
              onClick={() => setInvertedPrice(!invertedPrice)}
              variant="outline"
              width={{ base: "100%", sm: "auto" }}
            >
              {invertedPrice
                ? `${
                    pools.find((p) => p.contractId === selectedPool)?.symbolB
                  } / ${
                    pools.find((p) => p.contractId === selectedPool)?.symbolA
                  }`
                : `${
                    pools.find((p) => p.contractId === selectedPool)?.symbolA
                  } / ${
                    pools.find((p) => p.contractId === selectedPool)?.symbolB
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
          <>
            <Line data={priceData} options={chartOptions} />
            <Box
              position="absolute"
              bottom="8px"
              right="8px"
              bg={useColorModeValue("purple.600", "gray.800")}
              p={1}
              borderRadius="md"
              display="flex"
              alignItems="center"
              as="a"
              href={`https://voi.humble.sh/#/swap?poolId=${selectedPool || ""}`}
              target="_blank"
              rel="noopener noreferrer"
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
            >
              <Image
                src="https://voi.humble.sh/logo.png"
                alt="Humble"
                height="24px"
                title="Available on Humble"
              />
            </Box>
          </>
        )}
      </Box>
    </Stack>
  );
};

export default PriceLineChart;
