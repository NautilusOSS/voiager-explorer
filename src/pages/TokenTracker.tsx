import React, { useEffect, useState } from "react";
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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatArrow,
  StatHelpText,
  ButtonGroup,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Image,
  Center,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { getVoiPrice } from "../services/price";

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
  change_1h: TokenPrice;
  change_24h: TokenPrice;
  change_7d: TokenPrice;
}

type ViewMode = "grid-icon" | "grid-compact" | "grid-full" | "list";

const TokenTracker: React.FC = () => {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid-icon");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(true);
  const [voiUsdPrice, setVoiUsdPrice] = useState<number | null>(null);

  const tableBackground = useColorModeValue("white", "gray.800");

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

  const formatPrice = (price: string | null) => {
    if (!price || Number(price) === 0) return null;
    if (!voiUsdPrice) return null;

    const voiPrice = Number(price);
    const usdPrice = voiPrice * voiUsdPrice;
    return usdPrice.toFixed(6);
  };

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://humble-api.voi.nautilus.sh/tokens"
        );
        const data = await response.json();

        // Map Humble API response to Token interface
        const mappedTokens: Token[] = data.tokens
          .filter((token: any) => {
            // Filter out tokens with empty names or test tokens
            return (
              token.name &&
              token.name.trim() !== "" &&
              !token.name.toLowerCase().includes("test")
            );
          })
          .map((token: any) => {
            // Override Wrapped Voi (assetId 390001) to display as Voi
            const isWrappedVoi = token.assetId === "390001";
            return {
              contractId: parseInt(token.assetId),
              name: isWrappedVoi ? "Voi" : (token.name || ""),
              symbol: isWrappedVoi ? "VOI" : (token.unitName || ""),
              decimals: parseInt(token.decimals) || 0,
              totalSupply: token.totalSupply || "0",
              creator: "", // Not available from Humble API
              deleted: 0, // Default value
              price: "0", // Default value, price not available from Humble API
              tokenId: token.assetId,
              verified: null, // Not available from Humble API
              mintRound: token.lastUpdated || 0,
              change_1h: {
                latest_price: null,
                earliest_price: null,
                percent_change: null,
              },
              change_24h: {
                latest_price: null,
                earliest_price: null,
                percent_change: null,
              },
              change_7d: {
                latest_price: null,
                earliest_price: null,
                percent_change: null,
              },
            };
          })
          .sort((a: Token, b: Token) => {
            // Sort by name alphabetically since price is not available
            return a.name.localeCompare(b.name);
          });

        setTokens(mappedTokens);
        setError(null);
      } catch (err) {
        console.error("Error fetching tokens:", err);
        setError("Failed to fetch tokens");
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
    const interval = setInterval(fetchTokens, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchVoiPrice = async () => {
      try {
        const data = await getVoiPrice();
        setVoiUsdPrice(data.voi.usd);
      } catch (error) {
        console.error("Error fetching VOI price:", error);
      }
    };

    fetchVoiPrice();
    const interval = setInterval(fetchVoiPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const renderPrice = (price: string | null) => {
    const usdPrice = formatPrice(price);
    return (
      <Tooltip
        label={price ? `${Number(price).toFixed(6)} VOI` : "\u00A0"}
        hasArrow
      >
        <Text fontSize="sm" fontWeight="semibold">
          {usdPrice ? `$${usdPrice}` : "\u00A0"}
        </Text>
      </Tooltip>
    );
  };

  const renderGridIconView = (tokens: Token[]) => (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing={4}>
      {tokens.map((token) => (
        <Card
          key={token.contractId}
          onClick={() => navigate(`/token/${token.contractId}`)}
          cursor="pointer"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
          transition="all 0.2s"
          h="100%"
          display="flex"
          flexDirection="column"
          minH="180px"
        >
          <CardBody
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            p={4}
            flex="1"
            gap={2}
          >
            <Box>
              <Image
                src={
                  token.contractId === 390001
                    ? `https://asset-verification.nautilus.sh/icons/0.png`
                    : `https://asset-verification.nautilus.sh/icons/${token.contractId}.png`
                }
                alt={token.name}
                boxSize="60px"
                borderRadius="full"
                fallback={
                  <Center boxSize="60px" bg="gray.100" borderRadius="full">
                    <Text fontSize="2xl">{token.symbol[0]}</Text>
                  </Center>
                }
              />
            </Box>
            <Text fontWeight="bold" fontSize="sm" noOfLines={1} textAlign="center">
              {token.name}
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              {token.symbol}
            </Text>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  const renderGridCompactView = (tokens: Token[]) => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
      {tokens.map((token) => (
        <Card
          key={token.contractId}
          onClick={() => navigate(`/token/${token.contractId}`)}
          cursor="pointer"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Stack spacing={3}>
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={2}>
                  <Badge colorScheme="blue">{token.symbol}</Badge>
                  {token.verified === 1 && (
                    <Badge colorScheme="green">Verified</Badge>
                  )}
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  #{token.contractId}
                </Text>
              </Flex>
              <Text fontWeight="bold" noOfLines={1}>
                {token.name}
              </Text>
              <Flex justify="space-between" align="center">
                {renderPrice(token.price)}
                {token.change_24h?.percent_change && (
                  <Text
                    color={
                      token.change_24h.percent_change >= 0
                        ? "green.500"
                        : "red.500"
                    }
                    fontSize="sm"
                  >
                    {token.change_24h.percent_change.toFixed(2)}%
                  </Text>
                )}
              </Flex>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </SimpleGrid>
  );

  const renderGridFullView = (tokens: Token[]) => (
    <Stack spacing={4}>
      {tokens.map((token) => (
        <Card
          key={token.contractId}
          onClick={() => navigate(`/token/${token.contractId}`)}
          cursor="pointer"
          _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
          transition="all 0.2s"
        >
          <CardBody>
            <Stack spacing={4}>
              <Flex justify="space-between" align="center">
                <Stack>
                  <Flex align="center" gap={2}>
                    <Heading size="md">{token.name}</Heading>
                    {token.verified === 1 && (
                      <Badge colorScheme="green">Verified</Badge>
                    )}
                  </Flex>
                  <Badge colorScheme="blue" alignSelf="flex-start">
                    {token.symbol}
                  </Badge>
                </Stack>
              </Flex>

              <SimpleGrid columns={2} spacing={4}>
                <Stat>
                  <StatLabel>Price</StatLabel>
                  <StatNumber fontSize="lg">
                    {renderPrice(token.price)}
                  </StatNumber>
                  {token.change_24h?.percent_change && (
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
                  )}
                </Stat>
                {token.totalSupply !==
                  "115792089237316195423570985008687907853269984665640564039457584007913129639935" && (
                  <Stat>
                    <StatLabel>Total Supply</StatLabel>
                    <StatNumber fontSize="lg">
                      {formatSupply(token.totalSupply, token.decimals)}
                    </StatNumber>
                    <StatHelpText>{token.decimals} decimals</StatHelpText>
                  </Stat>
                )}
              </SimpleGrid>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );

  const renderListView = (tokens: Token[]) => (
    <Box overflowX="auto">
      <Table variant="simple" bg={tableBackground}>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Symbol</Th>
            <Th isNumeric>Price</Th>
            <Th isNumeric>Change (7d)</Th>
            <Th isNumeric>Total Supply</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tokens.map((token) => (
            <Tr
              key={token.contractId}
              onClick={() => navigate(`/token/${token.contractId}`)}
              cursor="pointer"
              _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
            >
              <Td>{token.name}</Td>
              <Td>{token.symbol}</Td>
              <Td isNumeric>{renderPrice(token.price)}</Td>
              <Td isNumeric>
                <Text
                  color={
                    token.change_7d?.percent_change || 0 >= 0
                      ? "green.500"
                      : "red.500"
                  }
                >
                  {token.change_7d?.percent_change
                    ? `${token.change_7d.percent_change.toFixed(2)}%`
                    : "\u00A0"}
                </Text>
              </Td>
              <Td isNumeric>
                {formatSupply(token.totalSupply, token.decimals)}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  // Filter tokens based on verification status
  // Note: Humble API doesn't provide verification status, so all tokens are shown
  const filteredTokens = tokens;

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <Heading size="lg">Token Tracker (ARC200)</Heading>
          <Flex gap={4} align="center">
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="verified-only" mb="0">
                Verified Only
              </FormLabel>
              <Switch
                id="verified-only"
                isChecked={showVerifiedOnly}
                onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                colorScheme="green"
              />
            </FormControl>
            <ButtonGroup size="sm" isAttached variant="outline">
              <IconButton
                aria-label="Grid icon view"
                icon={<ViewIcon />}
                onClick={() => setViewMode("grid-icon")}
                colorScheme={viewMode === "grid-icon" ? "blue" : undefined}
              />
              <IconButton
                aria-label="Grid compact view"
                icon={<ViewOffIcon />}
                onClick={() => setViewMode("grid-compact")}
                colorScheme={viewMode === "grid-compact" ? "blue" : undefined}
              />
              <IconButton
                aria-label="Grid full view"
                icon={<HamburgerIcon />}
                onClick={() => setViewMode("grid-full")}
                colorScheme={viewMode === "grid-full" ? "blue" : undefined}
              />
              <IconButton
                aria-label="List view"
                icon={<HamburgerIcon />}
                onClick={() => setViewMode("list")}
                colorScheme={viewMode === "list" ? "blue" : undefined}
              />
            </ButtonGroup>
          </Flex>
        </Flex>

        {loading ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="xl" />
          </Flex>
        ) : error ? (
          <Box p={8} textAlign="center">
            <Text color="red.500">{error}</Text>
          </Box>
        ) : (
          <>
            {viewMode === "grid-icon" && renderGridIconView(filteredTokens)}
            {viewMode === "grid-compact" &&
              renderGridCompactView(filteredTokens)}
            {viewMode === "grid-full" && renderGridFullView(filteredTokens)}
            {viewMode === "list" && renderListView(filteredTokens)}
          </>
        )}
      </Stack>
    </Container>
  );
};

export default TokenTracker;
