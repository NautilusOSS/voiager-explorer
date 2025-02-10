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
import { Scatter } from "react-chartjs-2";
import { enUS } from "date-fns/locale";

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

const generateCandleData = (
  swaps: any[],
  timeRange: string,
  invertedPrice: boolean
) => {
  const candlePeriod =
    timeRange === "1H"
      ? 60 // 1 minute candles
      : timeRange === "24H"
      ? 900 // 15 minute candles
      : timeRange === "7D"
      ? 3600 // 1 hour candles
      : 14400; // 4 hour candles for 30D

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
    });
  }

  // Fill in actual swap data
  swaps.forEach((swap) => {
    const candleTime =
      Math.floor(swap.timestamp / candlePeriod) * candlePeriod * 1000;
    const price = invertedPrice ? 1 / Number(swap.price) : Number(swap.price);

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

interface PriceCandleChartProps {
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

const PriceCandleChart: React.FC<PriceCandleChartProps> = ({
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
        type: "candlestick",
        yAxisID: "y",
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
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        mode: "nearest",
        intersect: false,
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
            document.body.appendChild(div);
          }

          // Hide if no tooltip
          if (context.tooltip.opacity === 0) {
            tooltipEl!.style.opacity = "0";
            return;
          }

          // Position tooltip at top left of chart
          const rect = context.chart.canvas.getBoundingClientRect();
          const horizontalPadding = 16; // Padding from left edge
          const verticalPadding = 4; // Further reduced padding from top edge

          // Fixed position at top left
          const x = rect.left + window.scrollX + horizontalPadding;
          const y = rect.top + window.scrollY + verticalPadding;

          // Position the tooltip
          tooltipEl!.style.left = x + "px";
          tooltipEl!.style.top = y + "px";
          tooltipEl!.style.opacity = "1";
          tooltipEl!.style.zIndex = "1000";

          // Set text
          if (context.tooltip.dataPoints) {
            const dataPoint = context.tooltip.dataPoints[0];
            const selectedPoolData = pools.find(
              (p) => p.contractId === selectedPool
            );
            const poolSymbols = selectedPoolData
              ? `${selectedPoolData.symbolA}/${selectedPoolData.symbolB}`
              : "";

            const candleData = dataPoint.raw;
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
              </div>
            `;
          }
        },
      },
    },
    scales: {
      y: {
        position: "left",
        beginAtZero: false,
        grid: {
          display: true,
        },
        ticks: {
          callback: (value: any) => {
            // Handle different price ranges appropriately
            if (value < 0.000001) return value.toExponential(2);
            if (value < 0.001) return value.toFixed(6);
            if (value < 1) return value.toFixed(4);
            return value.toFixed(2);
          },
        },
        // Add suggestedMin and suggestedMax based on data
        afterDataLimits: (scale: any) => {
          const minValue = Math.min(
            ...priceData.datasets[0].data.map((d: any) => d.l)
          );
          const maxValue = Math.max(
            ...priceData.datasets[0].data.map((d: any) => d.h)
          );
          const padding = (maxValue - minValue) * 0.1; // 10% padding

          scale.min = Math.max(0, minValue - padding);
          scale.max = maxValue + padding;
        },
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
          tooltipFormat: "PPpp",
        },
        adapters: {
          date: {
            locale: enUS,
          },
        },
        grid: {
          display: true,
        },
      },
    },
    elements: {
      candlestick: {
        color: {
          up: "rgba(75, 192, 192, 1)",
          down: "rgba(255, 99, 132, 1)",
          unchanged: "rgba(75, 192, 192, 1)",
        },
        borderColor: {
          up: "rgba(75, 192, 192, 1)",
          down: "rgba(255, 99, 132, 1)",
          unchanged: "rgba(75, 192, 192, 1)",
        },
        wick: {
          color: {
            up: "rgba(75, 192, 192, 1)",
            down: "rgba(255, 99, 132, 1)",
            unchanged: "rgba(75, 192, 192, 1)",
          },
        },
      },
    },
  };

  useEffect(() => {
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
        setSwapData(recentSwaps);

        const candleData = generateCandleData(
          recentSwaps,
          timeRange,
          invertedPrice
        );

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
              type: "candlestick",
              yAxisID: "y",
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
            <Scatter data={priceData} options={chartOptions} />
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

export default PriceCandleChart;
