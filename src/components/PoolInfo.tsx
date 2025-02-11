import React from "react";
import {
  Box,
  Text,
  Button,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";

interface PoolInfoProps {
  contractId: string;
}

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

const PoolInfo: React.FC<PoolInfoProps> = ({ contractId }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const [, setPoolData] = React.useState<any>(null);
  const [poolDetails, setPoolDetails] = React.useState<any>(null);
  const [highestTvlPoolId, setHighestTvlPoolId] = React.useState<string>("");
  const [, setIsLoading] = React.useState(true);
  const [tokenInfo, setTokenInfo] = React.useState<TokenInfo | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricesResponse, poolsResponse, tokenResponse] =
          await Promise.all([
            fetch(
              `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/prices?contractId=${contractId}`
            ),
            fetch(
              `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?tokenId=${contractId}`
            ),
            fetch(
              `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?contractId=${contractId}&includes=all`
            ),
          ]);

        const pricesData = await pricesResponse.json();
        const poolsData = await poolsResponse.json();
        const tokenData = await tokenResponse.json();

        console.log("tokenData", tokenData);

        let price = 0;

        if (pricesData.prices && pricesData.prices.length > 0) {
          console.log("pricesData", pricesData);
          const priceData = pricesData.prices.find((p: any) => {
            const tokenId =
              p.poolId.split("-")[0] === "0"
                ? p.poolId.split("-")[1]
                : p.poolId.split("-")[0];
            return tokenId === contractId;
          });
          price = priceData.price;
          setPoolData(priceData);
        }

        console.log("price", price);

        if (poolsData.pools && poolsData.pools.length > 0) {
          let tvl = 0;
          let vol = 0;
          let maxTvl = 0;
          let bestPoolId = "";

          for (const pool of poolsData.pools) {
            const poolTvl = Number(pool.tvl);
            const isTokenInPool =
              pool.tokAId === contractId || pool.tokBId === contractId;

            if (isTokenInPool) {
              // Update highest TVL pool
              if (poolTvl > maxTvl) {
                maxTvl = poolTvl;
                bestPoolId = pool.contractId;
              }

              // Add to total TVL
              tvl += poolTvl;

              // Add volume from the relevant side of the pool
              vol += Number(pool.tokAId === contractId ? pool.volA : pool.volB);
            }
          }

          setHighestTvlPoolId(bestPoolId);
          setPoolDetails({
            price: price,
            tvl: {
              contractId: tvl * price,
              "0": tvl,
            },
            vol: {
              "7d": vol,
              "24h": vol / 7,
              "30d": (vol / 7) * 30,
            },
          });
        }

        if (tokenData.tokens && tokenData.tokens.length > 0) {
          const token = tokenData.tokens[0];
          setTokenInfo({
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contractId]);

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)} VOI`;
  };

  const currentPrice = poolDetails ? 1 / Number(poolDetails.price) : 0;
  const totalLiquidity = poolDetails ? Number(poolDetails.tvl["0"]) : 0;
  const volume24h = poolDetails ? Number(poolDetails.vol["7d"]) : 0;

  const handleTradeClick = () => {
    window.open(
      `https://voi.humble.sh/#/swap?poolId=${highestTvlPoolId}`,
      "_blank"
    );
  };

  return (
    <Box p={6} borderRadius="lg" bg={bgColor} boxShadow="sm">
      {/*tokenInfo && (
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          {tokenInfo.name} ({tokenInfo.symbol})
        </Text>
      )*/}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        <Box>
          <Text color={textColor} fontSize="sm" mb={2}>
            Current Price
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {formatCurrency(currentPrice)}
          </Text>
        </Box>

        <Box>
          <Text color={textColor} fontSize="sm" mb={2}>
            Total Liquidity
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {formatCurrency(totalLiquidity)}
          </Text>
        </Box>

        <Box>
          <Text color={textColor} fontSize="sm" mb={2}>
            Volume (7d)
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {formatCurrency(volume24h)}
          </Text>
        </Box>

        <Box>
          <Button
            colorScheme="blue"
            size="lg"
            width="full"
            mt={4}
            onClick={handleTradeClick}
          >
            Buy {tokenInfo?.symbol || ""}
          </Button>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default PoolInfo;
