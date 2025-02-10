import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Flex,
  Text,
  IconButton,
  useColorModeValue,
  Stack,
  Card,
  CardBody,
  Badge,
  SimpleGrid,
  Divider,
  useBreakpointValue,
  Button,
  Select,
  HStack,
  Collapse,
  VStack,
  Skeleton,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { CopyIcon, InfoIcon, DownloadIcon, RepeatIcon } from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/react";
import { BigNumber } from "bignumber.js";

interface Token {
  contractId: number;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

interface Holder {
  address: string;
  balance: string;
  percentage: number;
  isLiquidityPool?: boolean;
}

interface HoldersTableProps {
  contractId: string;
  excludeAddresses?: string[];
  distributionAmount?: {
    amount: number;
    decimals: number;
    symbol: string;
  };
}

const HoldersTable = ({
  contractId,
  excludeAddresses = [],
}: HoldersTableProps) => {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalHolders, setTotalHolders] = useState(0);
  const [token, setToken] = useState<Token | null>(null);
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [excludedAddresses, setExcludedAddresses] = useState<Set<string>>(
    new Set()
  );
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [liquidityPools, setLiquidityPools] = useState<Set<string>>(new Set());
  const [distributionAmount, setDistributionAmount] = useState<string>("");
  const [distributionDecimals, setDistributionDecimals] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEnVoi, setShowEnVoi] = useState(true);
  const [enVoiNames, setEnVoiNames] = useState<Record<string, string>>({});

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  const calculatePercentages = (holdersData: Holder[]) => {
    // Calculate total supply excluding excluded addresses
    const adjustedSupply = holdersData.reduce((acc, holder) => {
      if (!excludedAddresses.has(holder.address)) {
        return acc.plus(new BigNumber(holder.balance));
      }
      return acc;
    }, new BigNumber(0));

    // Recalculate percentages based on adjusted supply
    return holdersData.map((holder) => ({
      ...holder,
      percentage:
        excludedAddresses.has(holder.address) || adjustedSupply.isZero()
          ? 0
          : new BigNumber(holder.balance)
              .div(adjustedSupply)
              .times(100)
              .toNumber() || 0, // Handle NaN by defaulting to 0
    }));
  };

  const toggleAddressExclusion = (address: string) => {
    setExcludedAddresses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const toggleLiquidityPool = (address: string) => {
    setLiquidityPools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  };

  const calculateDistributionAmount = (
    percentage: number,
    totalAmount: string
  ): string => {
    if (!totalAmount) return "0";
    const amount = new BigNumber(totalAmount).times(percentage).div(100);
    return amount.toFixed(distributionDecimals);
  };

  const fetchToken = async () => {
    try {
      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/tokens?contractId=${contractId}`
      );
      const data = await response.json();
      if (data.tokens && data.tokens.length > 0) {
        setToken(data.tokens[0]);
      }
    } catch (error) {
      console.error("Error fetching token:", error);
    }
  };

  const fetchAllHolders = async () => {
    if (!token) return [];

    try {
      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${contractId}`
      );
      const data = await response.json();

      const totalSupply = new BigNumber(token.totalSupply).div(
        new BigNumber(10).pow(token.decimals)
      );

      return data.balances
        .map((h: any) => {
          const balance = new BigNumber(h.balance).div(
            new BigNumber(10).pow(token.decimals)
          );

          return {
            address: h.accountId,
            balance: h.balance,
            percentage: balance.div(totalSupply).times(100).toNumber(),
          };
        })
        .sort(
          (a: Holder, b: Holder) =>
            parseFloat(b.balance) - parseFloat(a.balance)
        );
    } catch (error) {
      console.error("Error fetching all holders:", error);
      return [];
    }
  };

  const handleExport = async () => {
    if (!holders.length) return;

    try {
      toast({
        title: "Preparing export...",
        status: "info",
        duration: null,
        isClosable: false,
        position: "top",
      });

      const allHolders = await fetchAllHolders();
      const filteredHolders = allHolders.filter(
        (holder: Holder) =>
          !excludeAddresses.includes(holder.address) &&
          !excludedAddresses.has(holder.address)
      );

      // Recalculate percentages for export
      const holdersWithUpdatedPercentages = calculatePercentages(
        filteredHolders
      ).map((holder: Holder) => ({
        ...holder,
        isLiquidityPool: liquidityPools.has(holder.address),
      }));

      const headers = [
        "Rank,Address,Balance,Percentage,Type" +
          (distributionAmount ? ",Distribution Amount" : "") +
          "\n",
      ];
      const csvData = holdersWithUpdatedPercentages
        .map((holder, index) => {
          const basicData = `${index + 1},${holder.address},${
            holder.balance
          },${holder.percentage.toFixed(2)},${
            holder.isLiquidityPool ? "Liquidity Pool" : "Wallet"
          }`;
          if (distributionAmount) {
            const distribution = calculateDistributionAmount(
              holder.percentage,
              distributionAmount
            );
            return `${basicData},${distribution}`;
          }
          return basicData;
        })
        .join("\n");

      const blob = new Blob([headers + csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `holders-${contractId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.closeAll();
      toast({
        title: "Export complete",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    } catch (error) {
      console.error("Error exporting holders:", error);
      toast.closeAll();
      toast({
        title: "Export failed",
        description: "An error occurred while exporting the data.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchToken();
      const response = await fetch(
        `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${contractId}&limit=${rowsPerPage}&offset=${
          (page - 1) * rowsPerPage
        }`
      );
      const data = await response.json();

      // Update holders with new data
      if (token) {
        const filteredBalances = data.balances.filter(
          (h: any) => !excludeAddresses.includes(h.accountId)
        );
        setTotalHolders(data.total);

        const totalSupply = new BigNumber(token.totalSupply).div(
          new BigNumber(10).pow(token.decimals)
        );

        const holders = filteredBalances.map((h: any) => {
          const balance = new BigNumber(h.balance).div(
            new BigNumber(10).pow(token.decimals)
          );

          return {
            address: h.accountId,
            balance: balance.toString(),
            percentage: balance.div(totalSupply).times(100).toNumber(),
          };
        });

        const sortedHolders = holders.sort(
          (a: Holder, b: Holder) =>
            parseFloat(b.balance) - parseFloat(a.balance)
        );

        const holdersWithUpdatedPercentages =
          calculatePercentages(sortedHolders);
        setHolders(holdersWithUpdatedPercentages);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchEnVoiNames = async (addresses: string[]) => {
    try {
      // Fetch in batches of 50 addresses
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < addresses.length; i += batchSize) {
        batches.push(addresses.slice(i, i + batchSize));
      }

      const names: Record<string, string> = {};
      
      // Process each batch
      for (const batch of batches) {
        const response = await fetch(`https://api.envoi.sh/api/name/${batch.join(',')}`);
        const data = await response.json();
        data.results?.forEach((result: any) => {
          if (result.name) {
            names[result.address] = result.name;
          }
        });
      }
      
      setEnVoiNames(names);
    } catch (error) {
      console.error("Error fetching enVoi names:", error);
    }
  };

  console.log(enVoiNames);

  useEffect(() => {
    fetchToken();
  }, [contractId]);

  useEffect(() => {
    const fetchHolders = async () => {
      if (!token) return;

      try {
        setLoading(true);

        // Add delay promise
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await fetch(
          `https://mainnet-idx.nautilus.sh/nft-indexer/v1/arc200/balances?contractId=${contractId}&limit=${rowsPerPage}&offset=${
            (page - 1) * rowsPerPage
          }`
        );
        const data = await response.json();

        // Filter out excluded addresses before setting total
        const filteredBalances = data.balances.filter(
          (h: any) => !excludeAddresses.includes(h.accountId)
        );
        setTotalHolders(data.total);

        const totalSupply = new BigNumber(token.totalSupply).div(
          new BigNumber(10).pow(token.decimals)
        );

        const holders = filteredBalances.map((h: any) => {
          const balance = new BigNumber(h.balance).div(
            new BigNumber(10).pow(token.decimals)
          );

          return {
            address: h.accountId,
            balance: balance.toString(),
            percentage: balance.div(totalSupply).times(100).toNumber(),
          };
        });

        // Sort by balance descending
        const sortedHolders = holders.sort(
          (a: Holder, b: Holder) =>
            parseFloat(b.balance) - parseFloat(a.balance)
        );

        // Calculate percentages with exclusions
        const holdersWithUpdatedPercentages =
          calculatePercentages(sortedHolders);
        setHolders(holdersWithUpdatedPercentages);
      } catch (error) {
        console.error("Error fetching holders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHolders();
  }, [
    contractId,
    page,
    rowsPerPage,
    token,
    excludedAddresses,
    excludeAddresses,
  ]);

  useEffect(() => {
    if (showEnVoi && holders.length > 0) {
      fetchEnVoiNames(holders.map((h) => h.address));
    }
  }, [holders, showEnVoi]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1);
  };

  const totalPages = Math.ceil(totalHolders / rowsPerPage);

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

  const renderExportOptions = () => (
    <Collapse in={showExportOptions}>
      <VStack
        mt={4}
        p={4}
        bg={useColorModeValue("gray.50", "gray.700")}
        borderRadius="md"
        align="stretch"
        spacing={4}
      >
        <Text fontSize="sm" fontWeight="medium">
          Export Settings
        </Text>
        <Text fontSize="sm" color="gray.500">
          Use the "Include/Exclude" buttons in the table to filter addresses
          from the export.
          {excludedAddresses.size > 0 &&
            ` Currently excluding ${excludedAddresses.size} addresses.`}
        </Text>
        <Box>
          <Text fontSize="sm" mb={2}>
            Distribution Amount (optional)
          </Text>
          <HStack spacing={4}>
            <input
              type="number"
              value={distributionAmount}
              onChange={(e) => setDistributionAmount(e.target.value)}
              placeholder="Enter amount to distribute"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid",
                borderColor: useColorModeValue("gray.200", "gray.600"),
                background: useColorModeValue("white", "gray.700"),
                color: useColorModeValue("black", "white"),
              }}
            />
            <Select
              size="sm"
              value={distributionDecimals}
              onChange={(e) => setDistributionDecimals(Number(e.target.value))}
              width="150px"
            >
              <option value={0}>0 decimals</option>
              <option value={2}>2 decimals</option>
              <option value={4}>4 decimals</option>
              <option value={6}>6 decimals</option>
              <option value={8}>8 decimals</option>
            </Select>
          </HStack>
        </Box>
        <Button
          size="sm"
          colorScheme="blue"
          onClick={handleExport}
          isDisabled={!holders.length}
          leftIcon={<DownloadIcon />}
        >
          Download CSV
        </Button>
      </VStack>
    </Collapse>
  );

  const LoadingSkeleton = () => (
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
            <Th py={3} fontSize="xs">
              Rank
            </Th>
            <Th py={3} fontSize="xs">
              Address
            </Th>
            <Th py={3} fontSize="xs" isNumeric>
              Balance
            </Th>
            <Th py={3} fontSize="xs" isNumeric>
              % of Supply
            </Th>
            {showExportOptions && (
              <>
                <Th py={3} fontSize="xs">
                  Export
                </Th>
                <Th py={3} fontSize="xs">
                  Type
                </Th>
              </>
            )}
          </Tr>
        </Thead>
        <Tbody>
          {[...Array(10)].map((_, i) => (
            <Tr key={i}>
              <Td py={2}>
                <Skeleton height="20px" width="30px" />
              </Td>
              <Td py={2}>
                <Skeleton height="20px" width="150px" />
              </Td>
              <Td py={2} isNumeric>
                <Skeleton height="20px" width="100px" ml="auto" />
              </Td>
              <Td py={2} isNumeric>
                <Skeleton height="20px" width="80px" ml="auto" />
              </Td>
              {showExportOptions && (
                <>
                  <Td py={2}>
                    <Skeleton height="24px" width="80px" />
                  </Td>
                  <Td py={2}>
                    <Skeleton height="24px" width="80px" />
                  </Td>
                </>
              )}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );

  const LoadingSkeletonMobile = () => (
    <Stack spacing={4}>
      {[...Array(10)].map((_, index) => (
        <Card key={index}>
          <CardBody>
            <Stack spacing={3}>
              <Flex justify="space-between" align="center">
                <Skeleton height="20px" width="40px" />
                <Skeleton height="20px" width="120px" />
              </Flex>
              <Divider />
              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    Balance
                  </Text>
                  <Skeleton height="20px" width="100px" mt={1} />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    % of Supply
                  </Text>
                  <Skeleton height="20px" width="80px" mt={1} />
                </Box>
              </SimpleGrid>
            </Stack>
          </CardBody>
        </Card>
      ))}
    </Stack>
  );

  if (loading) {
    return (
      <Box>
        {isMobile ? <LoadingSkeletonMobile /> : <LoadingSkeleton />}
        {renderPagination()}
        {renderExportOptions()}
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box>
        {!holders.length ? (
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
                No holders found
              </Text>
            </Flex>
          </Box>
        ) : (
          <Stack spacing={4}>
            {holders.map((holder, index) => (
              <Card
                key={holder.address}
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
                      <Badge colorScheme="purple">#{index + 1}</Badge>
                      <Flex align="center" gap={2}>
                        <RouterLink to={`/account/${holder.address}`}>
                          <Text color="blue.500">
                            {showEnVoi && enVoiNames[holder.address]
                              ? enVoiNames[holder.address]
                              : formatAddress(holder.address)}
                          </Text>
                        </RouterLink>
                        <IconButton
                          aria-label="Copy address"
                          icon={<CopyIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(holder.address);
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
                        <Text fontWeight="semibold">{holder.balance}</Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">
                          % of Supply
                        </Text>
                        <Text fontWeight="semibold">
                          {(holder.percentage || 0).toFixed(2)}%
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Stack>
        )}
        {renderPagination()}
        {renderExportOptions()}
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={2}>
          <Text fontSize="lg" fontWeight="medium" whiteSpace="nowrap">
            Token Holders
          </Text>
          <FormControl display="flex" alignItems="center">
            <FormLabel
              htmlFor="envoi-switch"
              mb="0"
              ml={3}
              mr={2}
              fontSize="sm"
              whiteSpace="nowrap"
            >
              Address
            </FormLabel>
            <Switch
              id="envoi-switch"
              size="sm"
              isChecked={showEnVoi}
              onChange={(e) => setShowEnVoi(e.target.checked)}
            />
            <FormLabel
              htmlFor="envoi-switch"
              mb="0"
              ml={2}
              fontSize="sm"
              whiteSpace="nowrap"
            >
              enVoi
            </FormLabel>
          </FormControl>
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            onClick={() => setShowExportOptions(!showExportOptions)}
            leftIcon={<DownloadIcon />}
          >
            Export Options
          </Button>
          <Button
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            loadingText="Refreshing"
            leftIcon={<RepeatIcon />}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>
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
              <Th py={3} fontSize="xs">
                Rank
              </Th>
              <Th py={3} fontSize="xs">
                Address
              </Th>
              <Th py={3} fontSize="xs" isNumeric>
                Balance
              </Th>
              <Th py={3} fontSize="xs" isNumeric>
                % of Supply
              </Th>
              {showExportOptions && (
                <>
                  <Th py={3} fontSize="xs">
                    Export
                  </Th>
                  <Th py={3} fontSize="xs">
                    Type
                  </Th>
                </>
              )}
            </Tr>
          </Thead>
          <Tbody>
            {!holders.length ? (
              <Tr>
                <Td colSpan={4}>
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    gap={4}
                    py={8}
                  >
                    <InfoIcon boxSize={10} color="gray.400" />
                    <Text color="gray.500" fontSize="lg" textAlign="center">
                      No holders found
                    </Text>
                  </Flex>
                </Td>
              </Tr>
            ) : (
              holders.map((holder, index) => (
                <Tr
                  key={holder.address}
                  _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}
                  transition="background-color 0.2s"
                >
                  <Td
                    py={2}
                    color={useColorModeValue("gray.600", "gray.400")}
                    fontSize="sm"
                  >
                    #{(page - 1) * rowsPerPage + index + 1}
                  </Td>
                  <Td py={2}>
                    <Flex align="center" gap={1}>
                      <RouterLink to={`/account/${holder.address}`}>
                        <Text color="blue.500" fontSize="sm">
                          {showEnVoi && enVoiNames[holder.address]
                            ? enVoiNames[holder.address]
                            : formatAddress(holder.address)}
                        </Text>
                      </RouterLink>
                      <IconButton
                        aria-label="Copy address"
                        icon={<CopyIcon />}
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(holder.address);
                        }}
                      />
                    </Flex>
                  </Td>
                  <Td
                    py={2}
                    isNumeric
                    fontSize="sm"
                    color={useColorModeValue("gray.600", "gray.400")}
                  >
                    {holder.balance}
                  </Td>
                  <Td
                    py={2}
                    isNumeric
                    fontSize="sm"
                    color={useColorModeValue("gray.600", "gray.400")}
                  >
                    {(holder.percentage || 0).toFixed(2)}%
                  </Td>
                  {showExportOptions && (
                    <>
                      <Td py={2}>
                        <Button
                          size="xs"
                          variant={
                            excludedAddresses.has(holder.address)
                              ? "solid"
                              : "outline"
                          }
                          colorScheme={
                            excludedAddresses.has(holder.address)
                              ? "red"
                              : "gray"
                          }
                          onClick={() => toggleAddressExclusion(holder.address)}
                        >
                          {excludedAddresses.has(holder.address)
                            ? "Excluded"
                            : "Include"}
                        </Button>
                      </Td>
                      <Td py={2}>
                        <Button
                          size="xs"
                          variant={
                            liquidityPools.has(holder.address)
                              ? "solid"
                              : "outline"
                          }
                          colorScheme={
                            liquidityPools.has(holder.address)
                              ? "purple"
                              : "gray"
                          }
                          onClick={() => toggleLiquidityPool(holder.address)}
                        >
                          {liquidityPools.has(holder.address)
                            ? "LP"
                            : "Mark as LP"}
                        </Button>
                      </Td>
                    </>
                  )}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>
      <Box mt={4}>
        <Flex justify="space-between" align="center" px={4}>
          {renderPagination()}
        </Flex>
        {renderExportOptions()}
      </Box>
    </Box>
  );
};

export default HoldersTable;
