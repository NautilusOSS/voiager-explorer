import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  Image,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  CopyIcon,
} from "@chakra-ui/icons";
import { getTransaction } from "../services/algorand";
import algosdk from "algosdk";

interface ParsedNote {
  client?: string;
  type?: "u" | "j";
  message?: string;
  raw?: string;
}

interface SwapEventData {
  who: string;
  swapIn: {
    a: string;
    b: string;
  };
  swapOut: {
    a: string;
    b: string;
  };
  poolBalances: {
    a: string;
    b: string;
  };
}

interface PoolData {
  poolBalA: string;
  poolBalB: string;
  symbolA: string;
  symbolB: string;
  tokADecimals: number;
  tokBDecimals: number;
  tvl: number;
  tvlA: string;
  tvlB: string;
  volA: string;
  volB: string;
  apr: string;
  tokAId: number;
  tokBId: number;
}

const AddressDisplay: React.FC<{ address: string; sliceLength?: number }> = ({
  address,
  sliceLength = 5,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
  };
  const shortAddress = `${address.slice(0, sliceLength)}...${address.slice(
    -sliceLength
  )}`;
  return (
    <Flex align="center" gap={1}>
      <Button
        as="a"
        href={`/account/${address}`}
        variant="link"
        colorScheme="blue"
      >
        {shortAddress}
      </Button>
      <Button size="xs" variant="ghost" onClick={handleCopy}>
        <CopyIcon />
      </Button>
    </Flex>
  );
};

const TxIdDisplay: React.FC<{ txId: string; sliceLength?: number }> = ({
  txId,
  sliceLength = 5,
}) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(txId);
  };
  return (
    <Flex align="center" gap={1}>
      <Link to={`/transaction/${txId}`}>
        <Text fontFamily="mono" fontSize="sm" color="gray.500">
          {txId.slice(0, sliceLength)}...{txId.slice(-sliceLength)}
        </Text>
      </Link>
      <Button size="xs" variant="ghost" onClick={handleCopy}>
        <CopyIcon />
      </Button>
    </Flex>
  );
};

const TransactionContainer: React.FC = () => {
  const { txId } = useParams<{ txId: string }>();
  const [transaction, setTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchTransaction = async () => {
      const response = await getTransaction(txId || "");
      setTransaction(response.transaction);
      setLoading(false);
    };
    fetchTransaction();
  }, [txId]);
  if (loading)
    return (
      <Box pt={8}>
        <Text>Loading...</Text>
      </Box>
    );
  if (!transaction)
    return (
      <Box pt={8}>
        <Text>Transaction not found</Text>
      </Box>
    );

  return (
    <>
      <Transaction compact transaction={transaction} />
      <Transaction transaction={transaction} />
    </>
  );
};
export const Transaction: React.FC<{
  transaction: any;
  compact?: boolean;
}> = ({ transaction, compact = false }) => {
  const [showRawData, setShowRawData] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  };

  const renderPaymentDetailsCompact = (tx: any) => {
    return (
      <Link to={`/transaction/${tx.id}`}>
        <Card>
          <CardBody>
            <Stack spacing={2}>
              <Flex justify="space-between" align="center">
                <Badge colorScheme="green">Payment</Badge>
                <Text fontWeight="bold">
                  {(Number(tx.paymentTransaction.amount) / 1_000_000).toFixed(
                    6
                  )}{" "}
                  VOI
                </Text>
              </Flex>
              <SimpleGrid columns={2} spacing={2}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    From
                  </Text>
                  <AddressDisplay address={tx.sender} />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    To
                  </Text>
                  <AddressDisplay address={tx.paymentTransaction.receiver} />
                </Box>
              </SimpleGrid>
              <Text fontSize="xs" color="gray.500" alignSelf="flex-end">
                {getRelativeTime(tx.roundTime)}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Link>
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
                <TxIdDisplay txId={tx.id} />
              </Box>
              <Text fontWeight="bold">
                {(Number(tx.paymentTransaction.amount) / 1_000_000).toFixed(6)}{" "}
                VOI
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
                <Text fontFamily="mono">{tx.paymentTransaction.receiver}</Text>
              </Box>
            </SimpleGrid>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              rightIcon={showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              alignSelf="flex-start"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
            {showDetails && (
              <>
                {tx.note && renderNote(formatNote(tx.note))}
                <Stack direction="row" spacing={4} align="center">
                  <Text fontSize="sm" color="gray.500">
                    Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Round:{" "}
                    <Button
                      as="a"
                      href={`/block/${tx.confirmedRound}`}
                      variant="link"
                      colorScheme="blue"
                      size="sm"
                    >
                      {tx.confirmedRound.toString()}
                    </Button>
                  </Text>
                  {tx.group && (
                    <Text fontSize="sm" color="gray.500">
                      Group:{" "}
                      <Button
                        as="a"
                        href={`/group/${Buffer.from(tx.group).toString(
                          "base64"
                        )}`}
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                      >
                        {Buffer.from(tx.group).toString("base64")}
                      </Button>
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.500">
                    Time: {new Date(tx.roundTime * 1000).toLocaleString()}
                  </Text>
                </Stack>
                {renderExplorerLinks(tx.id)}
              </>
            )}
          </Stack>
        </CardBody>
      </Card>
    );
  };
  // arc200_transferFrom
  // arc200_approve
  const ARC4_SELECTOR_ARC200_APPROVE = "tUIhJQ==";
  const ARC4_SELECTOR_ARC200_TRANSFER = "2nAluQ==";
  const ARC4_SELECTOR_WVOI_DEPOSIT = "AiMmfA==";
  const ARC4_SELECTOR_WVOI_WITHDRAW = "aM+Yzg==";
  const ARC4_SELECTOR_NOP = "WHWfog==";
  const ARC4_SELECTOR_HUMBLE_SWAP_BUY = "JrGGIQ==";
  const ARC4_SELECTOR_HUMBLE_SWAP_SELL = "nLvtuw==";
  const renderNop = (tx: any) => {
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge
                  colorScheme="purple"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  NOP
                </Badge>
              </Box>
            </Flex>

            <Stack spacing={3}>
              {tx.applicationTransaction.accounts?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Accounts
                  </Text>
                  {tx.applicationTransaction.accounts.map(
                    (account: any, index: number) => (
                      <AddressDisplay
                        key={index}
                        address={algosdk.encodeAddress(
                          Uint8Array.from(Buffer.from(account.publicKey))
                        )}
                      />
                    )
                  )}
                </Box>
              )}

              {tx.applicationTransaction.foreignApps?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Foreign Apps
                  </Text>
                  <Stack>
                    {tx.applicationTransaction.foreignApps.map(
                      (appId: number, index: number) => (
                        <Button
                          key={index}
                          as="a"
                          href={`/application/${appId.toString()}`}
                          variant="link"
                          colorScheme="blue"
                          size="sm"
                          alignSelf="flex-start"
                        >
                          {appId.toString()}
                        </Button>
                      )
                    )}
                  </Stack>
                </Box>
              )}

              {tx.applicationTransaction.foreignAssets?.length > 0 && (
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Foreign Assets
                  </Text>
                  <Stack>
                    {tx.applicationTransaction.foreignAssets.map(
                      (assetId: number, index: number) => (
                        <Button
                          key={index}
                          as="a"
                          href={`/asset/${assetId}`}
                          variant="link"
                          colorScheme="blue"
                          size="sm"
                          alignSelf="flex-start"
                        >
                          {assetId}
                        </Button>
                      )
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  // const renderWVOIWithdrawCompact = (tx: any) => {};

  const renderWVOIWithdraw = (tx: any) => {
    const who = tx.sender;
    const [amount] = tx.applicationTransaction.applicationArgs.slice(1);
    const amountNumber = (
      Number(BigInt("0x" + Buffer.from(amount).toString("hex"))) / 1_000_000
    ).toFixed(6);
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge
                  colorScheme="green"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  ARC200
                </Badge>
                <Badge
                  colorScheme="purple"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  WVOI Withdraw
                </Badge>
              </Box>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box>
                <Text fontWeight="semibold">Who</Text>
                <AddressDisplay address={who} />
              </Box>
              <Box>
                <Text fontWeight="semibold">Amount</Text>
                <Text fontFamily="mono">{amountNumber} VOI</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        </CardBody>
      </Card>
    );
  };
  const renderWVOIDeposit = (tx: any) => {
    const who = tx.sender;
    const [amount] = tx.applicationTransaction.applicationArgs.slice(1);
    const amountNumber = (
      Number(BigInt("0x" + Buffer.from(amount).toString("hex"))) / 1_000_000
    ).toFixed(6);
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge
                  colorScheme="green"
                  mb={2}
                  mr="-3px"
                  borderRightRadius="0"
                  borderBottomRightRadius="0"
                >
                  ARC200
                </Badge>
                <Badge
                  colorScheme="purple"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  WVOI Deposit
                </Badge>
              </Box>
              <Text>
                <Button
                  as="a"
                  href={`/token/${tx.applicationTransaction.applicationId}`}
                  variant="link"
                  colorScheme="blue"
                >
                  View Token
                </Button>
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box>
                <Text fontWeight="semibold">Who</Text>
                <AddressDisplay address={who} />
              </Box>
              <Box>
                <Text fontWeight="semibold">Amount</Text>
                <Text fontFamily="mono">{amountNumber} VOI</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderArc200ApproveCompact = (tx: any) => {
    const owner = tx.sender;
    const [spender, amount] =
      tx.applicationTransaction.applicationArgs.slice(1);
    const spenderAddress = algosdk.encodeAddress(
      Uint8Array.from(Buffer.from(spender, "base64"))
    );
    const amountNumber = BigInt(
      "0x" + Buffer.from(amount).toString("hex")
    ).toString();

    return (
      <Stack spacing={2}>
        <Flex justify="space-between" align="center">
          <Box>
            <Badge colorScheme="green" mr="-3px" borderRightRadius="0">
              ARC200
            </Badge>
            <Badge colorScheme="purple" borderLeftRadius="0">
              Approve
            </Badge>
          </Box>
          <Button
            as="a"
            href={`/token/${tx.applicationTransaction.applicationId}`}
            variant="link"
            colorScheme="blue"
            size="sm"
          >
            View Token
          </Button>
        </Flex>
        <SimpleGrid columns={2} spacing={2}>
          <Box>
            <Text fontSize="sm" color="gray.500">
              Owner
            </Text>
            <AddressDisplay address={owner} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.500">
              Spender
            </Text>
            <AddressDisplay address={spenderAddress} />
          </Box>
        </SimpleGrid>
        <Text fontSize="sm" fontWeight="semibold">
          Amount: {amountNumber}
        </Text>
      </Stack>
    );
  };

  const renderArc200Approve = (tx: any) => {
    const owner = tx.sender;
    const [spender, amount] =
      tx.applicationTransaction.applicationArgs.slice(1);
    const spenderAddress = algosdk.encodeAddress(
      Uint8Array.from(Buffer.from(spender, "base64"))
    );
    const amountNumber = BigInt(
      "0x" + Buffer.from(amount).toString("hex")
    ).toString();
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge
                  colorScheme="green"
                  mb={2}
                  mr="-3px"
                  borderRightRadius="0"
                  borderBottomRightRadius="0"
                >
                  ARC200
                </Badge>
                <Badge
                  colorScheme="purple"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  Approve
                </Badge>
              </Box>
              <Text>
                <Button
                  as="a"
                  href={`/token/${tx.applicationTransaction.applicationId}`}
                  variant="link"
                  colorScheme="blue"
                >
                  View Token
                </Button>
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box>
                <Text fontWeight="semibold">Owner</Text>
                <AddressDisplay address={owner} />
              </Box>
              <Box>
                <Text fontWeight="semibold">Spender</Text>
                <AddressDisplay address={spenderAddress} />
              </Box>
              <Box>
                <Text fontWeight="semibold">Amount</Text>
                <Text fontFamily="mono">{amountNumber}</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        </CardBody>
      </Card>
    );
  };
  const renderArc200Transfer = (tx: any) => {
    const fromAddress = tx.sender;
    const [to, amount] = tx.applicationTransaction.applicationArgs.slice(1);
    const toAddress = algosdk.encodeAddress(
      Uint8Array.from(Buffer.from(to, "base64"))
    );
    const amountNumber = BigInt(
      "0x" + Buffer.from(amount).toString("hex")
    ).toString();
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge
                  colorScheme="green"
                  mb={2}
                  mr="-3px"
                  borderRightRadius="0"
                  borderBottomRightRadius="0"
                >
                  ARC200
                </Badge>
                <Badge
                  colorScheme="purple"
                  mb={2}
                  borderLeftRadius="0"
                  borderTopLeftRadius="0"
                >
                  Transfer
                </Badge>
              </Box>
              <Text>
                <Button
                  as="a"
                  href={`/token/${tx.applicationTransaction.applicationId}`}
                  variant="link"
                  colorScheme="blue"
                >
                  View Token
                </Button>
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Box>
                <Text fontWeight="semibold">From</Text>
                <AddressDisplay address={fromAddress} />
              </Box>
              <Box>
                <Text fontWeight="semibold">To</Text>
                <AddressDisplay address={toAddress} />
              </Box>
              <Box>
                <Text fontWeight="semibold">Amount</Text>
                <Text fontFamily="mono">{amountNumber}</Text>
              </Box>
            </SimpleGrid>
          </Stack>
        </CardBody>
      </Card>
    );
  };
  const renderApplicationArgsFallback = (tx: any) => {
    return (
      <Box>
        <Text fontWeight="semibold">Sender</Text>
        <Text fontFamily="mono">{tx.sender}</Text>
        <Text fontWeight="semibold">Application Args</Text>
        <Stack spacing={1}>
          {tx.applicationTransaction.applicationArgs.map(
            (arg: string, index: number) => (
              <Text key={index} fontFamily="mono" fontSize="sm">
                {Buffer.from(arg).toString("base64")}
              </Text>
            )
          )}
        </Stack>
      </Box>
    );
  };

  const renderNopCompact = () => {
    return (
      <Stack spacing={2}>
        <Flex justify="space-between" align="center">
          <Box>
            <Badge colorScheme="purple">NOP</Badge>
          </Box>
        </Flex>
      </Stack>
    );
  };

  const renderArc200TransferCompact = (tx: any) => {
    const fromAddress = tx.sender;
    const [to, amount] = tx.applicationTransaction.applicationArgs.slice(1);
    const toAddress = algosdk.encodeAddress(
      Uint8Array.from(Buffer.from(to, "base64"))
    );
    const amountNumber = BigInt(
      "0x" + Buffer.from(amount).toString("hex")
    ).toString();

    return (
      <Stack spacing={2}>
        <Flex justify="space-between" align="center">
          <Box>
            <Badge colorScheme="green" mr="-3px" borderRightRadius="0">
              ARC200
            </Badge>
            <Badge colorScheme="purple" borderLeftRadius="0">
              Transfer
            </Badge>
          </Box>
          <Button
            as="a"
            href={`/token/${tx.applicationTransaction.applicationId}`}
            variant="link"
            colorScheme="blue"
            size="sm"
          >
            View Token
          </Button>
        </Flex>
        <SimpleGrid columns={2} spacing={2}>
          <Box>
            <Text fontSize="sm" color="gray.500">
              From
            </Text>
            <AddressDisplay address={fromAddress} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.500">
              To
            </Text>
            <AddressDisplay address={toAddress} />
          </Box>
        </SimpleGrid>
        <Text fontSize="sm" fontWeight="semibold">
          {amountNumber}
        </Text>
      </Stack>
    );
  };

  const renderWVOIDepositCompact = (tx: any) => {
    const who = tx.sender;
    const [amount] = tx.applicationTransaction.applicationArgs.slice(1);
    const amountNumber = (
      Number(BigInt("0x" + Buffer.from(amount).toString("hex"))) / 1_000_000
    ).toFixed(6);

    return (
      <Stack spacing={2}>
        <Flex justify="space-between" align="center">
          <Box>
            <Badge colorScheme="green" mr="-3px" borderRightRadius="0">
              ARC200
            </Badge>
            <Badge colorScheme="purple" borderLeftRadius="0">
              WVOI Deposit
            </Badge>
          </Box>
        </Flex>
        <SimpleGrid columns={2} spacing={2}>
          <Box>
            <Text fontSize="sm" color="gray.500">
              Who
            </Text>
            <AddressDisplay address={who} />
          </Box>
          <Box>
            <Text fontSize="sm" color="gray.500">
              Amount
            </Text>
            <Text fontSize="sm" fontWeight="semibold">
              {amountNumber} VOI
            </Text>
          </Box>
        </SimpleGrid>
      </Stack>
    );
  };

  const EVENT_SELECTOR_HUMBLE_SWAP = "H268Tw=="; // SwapEvent(address,(uint256,uint256),(uint256,uint256),(uint256,uint256))

  const getAssetIconUrl = (assetId?: number | string) => {
    if (!assetId) {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    } else if (assetId === "390001") {
      return "https://asset-verification.nautilus.sh/icons/0.png";
    }
    return `https://asset-verification.nautilus.sh/icons/${assetId}.png`;
  };

  const TokenIcon: React.FC<{
    assetId?: number | string;
    symbol?: string;
  }> = ({ assetId, symbol }) => (
    <Image
      borderRadius="full"
      src={getAssetIconUrl(assetId)}
      alt={`${symbol} icon`}
      width="20px"
      height="20px"
      mr={1}
      fallbackSrc={`https://asset-verification.nautilus.sh/icons/0.png`}
      onError={() => {
        console.warn(`Failed to load icon for asset ${assetId}`);
      }}
    />
  );

  const renderHumbleSwapCompact = (tx: any) => {
    const [poolData, setPoolData] = useState<PoolData | null>(null);
    useEffect(() => {
      const fetchPoolData = async () => {
        try {
          const response = await fetch(
            `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?contractId=${tx.applicationTransaction.applicationId}`
          );
          const data = await response.json();
          if (data.pools && data.pools.length > 0) {
            setPoolData(data.pools[0]);
          }
        } catch (error) {
          console.error("Error fetching pool data:", error);
        }
      };
      fetchPoolData();
    }, []);

    const swapType = Buffer.from(
      tx.applicationTransaction.applicationArgs[0]
    ).toString("base64");
    const isBuy = swapType === ARC4_SELECTOR_HUMBLE_SWAP_BUY;
    const [, , /*simulateRaw*/ /*amountRaw*/ slippageLimitRaw] =
      tx.applicationTransaction.applicationArgs.slice(1);
    const slippageLimit = BigInt(
      "0x" + Buffer.from(slippageLimitRaw).toString("hex")
    ).toString();

    const swapEvent = tx.logs.find((log: Uint8Array) => {
      const selector = Buffer.from(log).slice(0, 4).toString("base64");
      return selector === EVENT_SELECTOR_HUMBLE_SWAP;
    });
    const swapData = parseSwapEvent(swapEvent);

    // Format amounts with symbols
    const formatAmount = (amount: string, decimals: number = 6) => {
      return Number(amount) / Math.pow(10, decimals);
    };

    const swapInAmount = formatAmount(
      isBuy ? swapData?.swapIn?.b : swapData?.swapIn?.a,
      isBuy ? poolData?.tokBDecimals : poolData?.tokADecimals
    );
    const swapOutAmount = formatAmount(
      isBuy ? swapData?.swapOut?.a : swapData?.swapOut?.b,
      isBuy ? poolData?.tokADecimals : poolData?.tokBDecimals
    );

    const swapInSymbol = isBuy ? poolData?.symbolB : poolData?.symbolA;
    const swapOutSymbol = isBuy ? poolData?.symbolA : poolData?.symbolB;

    const rate =
      swapData && (Number(swapOutAmount) / Number(swapInAmount)).toFixed(8);
    const slippageLimitAmount = formatAmount(
      slippageLimit,
      isBuy ? poolData?.tokADecimals : poolData?.tokBDecimals
    );
    const slippage =
      swapData &&
      (
        (Number(swapOutAmount) - Number(slippageLimitAmount)) /
        Number(slippageLimitAmount)
      ).toFixed(2);

    return (
      <Link to={`/transaction/${tx.id}`}>
        <Card>
          <CardBody>
            <Stack spacing={2}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="green" mr="-3px" borderRightRadius="0">
                    Humble
                  </Badge>
                  <Badge colorScheme="purple" borderLeftRadius="0">
                    Swap
                  </Badge>
                </Box>
              </Flex>
              {swapData && (
                <>
                  <Text fontSize="sm" alignItems="center">
                    <Flex align="center">
                      <Flex align="center" display="inline-flex">
                        <TokenIcon
                          assetId={isBuy ? poolData?.tokBId : poolData?.tokAId}
                          symbol={swapInSymbol}
                        />
                        {swapInAmount} {swapInSymbol}
                      </Flex>
                      {" → "}
                      <Flex align="center" display="inline-flex">
                        <TokenIcon
                          assetId={isBuy ? poolData?.tokAId : poolData?.tokBId}
                          symbol={swapOutSymbol}
                        />
                        {swapOutAmount} {swapOutSymbol}
                      </Flex>
                    </Flex>
                  </Text>
                  {rate && (
                    <Text fontSize="xs" color="gray.500">
                      Rate: {rate} {swapOutSymbol}/{swapInSymbol}
                    </Text>
                  )}
                  <Flex justify="space-between" align="center">
                    {slippage && (
                      <Text fontSize="xs" color="gray.500">
                        Slippage: {slippage}%
                      </Text>
                    )}
                    <Text fontSize="xs" color="gray.500">
                      {getRelativeTime(tx.roundTime)}
                    </Text>
                  </Flex>
                </>
              )}
            </Stack>
          </CardBody>
        </Card>
      </Link>
    );
  };

  const renderHumbleSwap = (tx: any) => {
    const [poolData, setPoolData] = useState<PoolData | null>(null);
    useEffect(() => {
      const fetchPoolData = async () => {
        try {
          const response = await fetch(
            `https://mainnet-idx.nautilus.sh/nft-indexer/v1/dex/pools?contractId=${tx.applicationTransaction.applicationId}`
          );
          const data = await response.json();
          if (data.pools && data.pools.length > 0) {
            setPoolData(data.pools[0]);
          }
        } catch (error) {
          console.error("Error fetching pool data:", error);
        }
      };
      fetchPoolData();
    }, []);
    const swapType = Buffer.from(
      tx.applicationTransaction.applicationArgs[0]
    ).toString("base64");
    const isBuy = swapType === ARC4_SELECTOR_HUMBLE_SWAP_BUY;
    const [, , /*simulateRaw*/ /*amountRaw*/ slippageLimitRaw] =
      tx.applicationTransaction.applicationArgs.slice(1);
    // const amount = BigInt(
    //   "0x" + Buffer.from(amountRaw).toString("hex")
    // ).toString();
    const slippageLimit = BigInt(
      "0x" + Buffer.from(slippageLimitRaw).toString("hex")
    ).toString();
    const swapEvent = tx.logs.find((log: Uint8Array) => {
      const selector = Buffer.from(log).slice(0, 4).toString("base64");
      return selector === EVENT_SELECTOR_HUMBLE_SWAP;
    });
    const swapData = parseSwapEvent(swapEvent);

    // Format amounts with symbols
    const formatAmount = (amount: string, decimals: number = 6) => {
      return Number(amount) / Math.pow(10, decimals);
    };
    // const swapAmount = formatAmount(
    //   amount,
    //   isBuy ? poolData?.tokBDecimals : poolData?.tokADecimals
    // );
    // swap amount equal swap in amount
    const swapInAmount = formatAmount(
      isBuy ? swapData?.swapIn?.b : swapData?.swapIn?.a,
      isBuy ? poolData?.tokBDecimals : poolData?.tokADecimals
    );

    const swapInSymbol = isBuy ? poolData?.symbolB : poolData?.symbolA;

    const swapOutAmount = formatAmount(
      isBuy ? swapData?.swapOut?.a : swapData?.swapOut?.b,
      isBuy ? poolData?.tokADecimals : poolData?.tokBDecimals
    );

    const swapOutSymbol = isBuy ? poolData?.symbolA : poolData?.symbolB;

    const rate =
      swapData && (Number(swapOutAmount) / Number(swapInAmount)).toFixed(8);

    const slippageLimitAmount = formatAmount(
      slippageLimit,
      isBuy ? poolData?.tokADecimals : poolData?.tokBDecimals
    );

    // slippage tolerance is less than or equal to the swap out amount
    const slippage =
      swapData &&
      (
        (Number(swapOutAmount) - Number(slippageLimitAmount)) /
        Number(slippageLimitAmount)
      ).toFixed(2);

    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Stack spacing={3}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge
                    colorScheme="green"
                    mb={2}
                    mr="-3px"
                    borderRightRadius="0"
                  >
                    Humble
                  </Badge>
                  <Badge colorScheme="purple" mb={2}>
                    Swap
                  </Badge>
                </Box>
                <Box>
                  {/* replace with view pool button */}
                  <Button
                    as="a"
                    href={`/token/${tx.applicationTransaction.applicationId}`}
                    variant="link"
                    colorScheme="blue"
                  >
                    View Token
                  </Button>
                </Box>
              </Flex>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Swap
                </Text>
                <Text fontSize="sm">
                  <Flex align="center">
                    <Flex align="center" display="inline-flex">
                      <TokenIcon
                        assetId={isBuy ? poolData?.tokBId : poolData?.tokAId}
                        symbol={swapInSymbol}
                      />
                      {swapInAmount} {swapInSymbol}
                    </Flex>
                    {" → "}
                    <Flex align="center" display="inline-flex">
                      <TokenIcon
                        assetId={isBuy ? poolData?.tokAId : poolData?.tokBId}
                        symbol={swapOutSymbol}
                      />
                      {swapOutAmount} {swapOutSymbol}
                    </Flex>
                  </Flex>
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Rate
                </Text>
                <Text fontSize="sm">{rate}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Sender
                </Text>
                <AddressDisplay address={tx.sender} />
              </Box>
            </Stack>
            <Flex mt={4} justify="space-between" align="center">
              <Text fontSize="sm" color="gray.500">
                Slippage: {slippage}%
              </Text>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  {getRelativeTime(tx.roundTime)}
                </Text>
              </Box>
            </Flex>
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderApplicationArgs = (tx: any) => {
    if (tx.applicationTransaction.applicationArgs.length === 0) {
      return null;
    }
    const mSelector = Buffer.from(
      tx.applicationTransaction.applicationArgs[0]
    ).toString("base64");

    if (compact) {
      switch (mSelector) {
        case ARC4_SELECTOR_ARC200_TRANSFER:
          return renderArc200TransferCompact(tx);
        case ARC4_SELECTOR_ARC200_APPROVE:
          return renderArc200ApproveCompact(tx);
        case ARC4_SELECTOR_WVOI_DEPOSIT:
          return renderWVOIDepositCompact(tx);
        case ARC4_SELECTOR_NOP:
          return renderNopCompact();
        case ARC4_SELECTOR_HUMBLE_SWAP_BUY:
          return renderHumbleSwapCompact(tx);
        case ARC4_SELECTOR_HUMBLE_SWAP_SELL:
          return renderHumbleSwapCompact(tx);
        default:
          return (
            <Stack spacing={2}>
              <Badge colorScheme="purple">Application Call</Badge>
              <TxIdDisplay txId={tx.id} />
            </Stack>
          );
      }
    }

    // Existing non-compact rendering logic
    switch (mSelector) {
      case ARC4_SELECTOR_ARC200_TRANSFER:
        return renderArc200Transfer(tx);
      case ARC4_SELECTOR_ARC200_APPROVE:
        return renderArc200Approve(tx);
      case ARC4_SELECTOR_WVOI_DEPOSIT:
        return renderWVOIDeposit(tx);
      case ARC4_SELECTOR_WVOI_WITHDRAW:
        return renderWVOIWithdraw(tx);
      case ARC4_SELECTOR_NOP:
        return renderNop(tx);
      case ARC4_SELECTOR_HUMBLE_SWAP_BUY:
        return renderHumbleSwap(tx);
      case ARC4_SELECTOR_HUMBLE_SWAP_SELL:
        return renderHumbleSwap(tx);
      default:
        return renderApplicationArgsFallback(tx);
    }
  };

  const renderApplicationCallCompact = (tx: any) => {
    const mSelector = tx.applicationTransaction.applicationArgs?.[0]
      ? Buffer.from(tx.applicationTransaction.applicationArgs[0]).toString(
          "base64"
        )
      : null;

    const isIdentifiedCall = [
      ARC4_SELECTOR_ARC200_TRANSFER,
      ARC4_SELECTOR_ARC200_APPROVE,
      ARC4_SELECTOR_WVOI_DEPOSIT,
      ARC4_SELECTOR_NOP,
      ARC4_SELECTOR_HUMBLE_SWAP_BUY,
      ARC4_SELECTOR_HUMBLE_SWAP_SELL,
    ].includes(mSelector || "");

    return (
      <Link to={`/transaction/${tx.id}`}>
        <Card>
          <CardBody>
            <Stack spacing={2}>
              <Flex justify="space-between" align="center">
                <Box>
                  <Badge colorScheme="purple">Application Call</Badge>
                </Box>
                <Button
                  as="a"
                  href={`/application/${tx.applicationTransaction.applicationId}`}
                  variant="link"
                  colorScheme="blue"
                  size="sm"
                >
                  App #
                  {tx.applicationTransaction.applicationId?.toString() ||
                    "Create"}
                </Button>
              </Flex>
              {!isIdentifiedCall && mSelector && (
                <SimpleGrid columns={2} spacing={2}>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Sender
                    </Text>
                    <AddressDisplay address={tx.sender} />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      Method
                    </Text>
                    <Text fontSize="sm" fontFamily="mono">
                      {mSelector}
                    </Text>
                  </Box>
                </SimpleGrid>
              )}
              {renderApplicationArgs(tx)}
            </Stack>
          </CardBody>
        </Card>
      </Link>
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
                <TxIdDisplay txId={tx.id} />
              </Box>
              <Text>
                App ID:{" "}
                <Button
                  as="a"
                  href={`/application/${tx.applicationTransaction.applicationId}`}
                  variant="link"
                  colorScheme="blue"
                >
                  {tx.applicationTransaction.applicationId?.toString() ||
                    "Create"}
                </Button>
              </Text>
            </Flex>
            {renderApplicationArgs(tx)}
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              rightIcon={showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              alignSelf="flex-start"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
            {showDetails && (
              <Stack>
                {tx.note && renderNote(formatNote(tx.note))}
                <Stack direction="row" spacing={4} align="center">
                  <Text fontSize="sm" color="gray.500">
                    Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Round:{" "}
                    <Button
                      as="a"
                      href={`/block/${tx.confirmedRound}`}
                      variant="link"
                      colorScheme="blue"
                      size="sm"
                    >
                      {tx.confirmedRound.toString()}
                    </Button>
                  </Text>
                  {tx.group && (
                    <Text fontSize="sm" color="gray.500">
                      Group:{" "}
                      <Button
                        as="a"
                        href={`/group/${Buffer.from(tx.group).toString(
                          "base64"
                        )}`}
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                      >
                        {Buffer.from(tx.group).toString("base64")}
                      </Button>
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.500">
                    Time: {new Date(tx.roundTime * 1000).toLocaleString()}
                  </Text>
                </Stack>
                {renderExplorerLinks(tx.id)}
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderAssetTransferCompact = (tx: any) => {
    return (
      <Link to={`/transaction/${tx.id}`}>
        <Card>
          <CardBody>
            <Stack spacing={2}>
              <Flex justify="space-between" align="center">
                <Badge colorScheme="blue">Asset Transfer</Badge>
                <Button
                  as="a"
                  href={`/asset/${tx.assetTransferTransaction.assetId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  variant="link"
                  colorScheme="blue"
                  size="sm"
                >
                  Asset #{tx.assetTransferTransaction.assetId.toString()}
                </Button>
              </Flex>
              <SimpleGrid columns={2} spacing={2}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    From
                  </Text>
                  <AddressDisplay address={tx.sender} />
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    To
                  </Text>
                  <AddressDisplay
                    address={tx.assetTransferTransaction.receiver}
                  />
                </Box>
              </SimpleGrid>
              <Text fontSize="sm" fontWeight="semibold">
                Amount: {tx.assetTransferTransaction.amount.toString()}
              </Text>
              <Text fontSize="xs" color="gray.500" alignSelf="flex-end">
                {getRelativeTime(tx.roundTime)}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Link>
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
                <TxIdDisplay txId={tx.id} />
              </Box>
              <Text fontWeight="bold">
                Asset ID: {tx.assetTransferTransaction.assetId}
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
                  {tx.assetTransferTransaction.receiver}
                </Text>
              </Box>
            </SimpleGrid>
            <Box>
              <Text fontWeight="semibold">Amount</Text>
              <Text>{tx.assetTransferTransaction.amount.toLocaleString()}</Text>
            </Box>
            {tx.note && renderNote(formatNote(tx.note))}
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              rightIcon={showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              alignSelf="flex-start"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
            {showDetails && (
              <Stack direction="row" spacing={4} align="center">
                <Text fontSize="sm" color="gray.500">
                  Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Round:{" "}
                  <Button
                    as="a"
                    href={`/block/${tx.confirmedRound}`}
                    variant="link"
                    colorScheme="blue"
                    size="sm"
                  >
                    {tx.confirmedRound.toString()}
                  </Button>
                </Text>
                {tx.group && (
                  <Text fontSize="sm" color="gray.500">
                    Group:{" "}
                    <Button
                      as="a"
                      href={`/group/${Buffer.from(tx.group).toString(
                        "base64"
                      )}`}
                      variant="link"
                      colorScheme="blue"
                      size="sm"
                    >
                      {Buffer.from(tx.group).toString("base64")}
                    </Button>
                  </Text>
                )}
                <Text fontSize="sm" color="gray.500">
                  Time: {new Date(tx.roundTime * 1000).toLocaleString()}
                </Text>
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderStateProofCompact = (tx: any) => {
    return (
      <Link to={`/transaction/${tx.id}`}>
        <Card>
          <CardBody>
            <Stack spacing={2}>
              <Flex justify="space-between" align="center">
                <Badge colorScheme="orange">State Proof</Badge>
              </Flex>
              <SimpleGrid columns={2} spacing={2}>
                <Box>
                  <Text fontSize="sm" color="gray.500">
                    From
                  </Text>
                  <AddressDisplay address={tx.sender} />
                </Box>
                {/* <Box>
                  <Text fontSize="sm" color="gray.500">
                    Message
                  </Text>
                  <Text fontSize="sm" fontFamily="mono" isTruncated>
                    {tx.stateProofTransaction?.message?.toString() || "No message"}
                  </Text>
                </Box> */}
              </SimpleGrid>
              <Text fontSize="xs" color="gray.500" alignSelf="flex-end">
                {getRelativeTime(tx.roundTime)}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Link>
    );
  };

  const renderStateProof = (tx: any) => {
    return (
      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Flex justify="space-between" align="center">
              <Box>
                <Badge colorScheme="orange" mb={2}>
                  State Proof
                </Badge>
                <TxIdDisplay txId={tx.id} />
              </Box>
            </Flex>
            <Divider />
            <Box>
              <Text fontWeight="semibold">From</Text>
              <AddressDisplay address={tx.sender} />
            </Box>
            {/* {tx.stateProofTransaction?.message && (
              <Box>
                <Text fontWeight="semibold">Message</Text>
                <Text fontFamily="mono">
                  {tx.stateProofTransaction.message.toString()}
                </Text>
              </Box>
            )} */}
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              rightIcon={showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              alignSelf="flex-start"
            >
              {showDetails ? "Hide" : "Show"} Details
            </Button>
            {showDetails && (
              <Stack>
                {tx.note && renderNote(formatNote(tx.note))}
                <Stack direction="row" spacing={4} align="center">
                  <Text fontSize="sm" color="gray.500">
                    Fee: {(Number(tx.fee) / 1_000_000).toFixed(6)} VOI
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Round:{" "}
                    <Button
                      as="a"
                      href={`/block/${tx.confirmedRound}`}
                      variant="link"
                      colorScheme="blue"
                      size="sm"
                    >
                      {tx.confirmedRound.toString()}
                    </Button>
                  </Text>
                  {tx.group && (
                    <Text fontSize="sm" color="gray.500">
                      Group:{" "}
                      <Button
                        as="a"
                        href={`/group/${Buffer.from(tx.group).toString(
                          "base64"
                        )}`}
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                      >
                        {Buffer.from(tx.group).toString("base64")}
                      </Button>
                    </Text>
                  )}
                  <Text fontSize="sm" color="gray.500">
                    Time: {new Date(tx.roundTime * 1000).toLocaleString()}
                  </Text>
                </Stack>
                {renderExplorerLinks(tx.id)}
              </Stack>
            )}
          </Stack>
        </CardBody>
      </Card>
    );
  };

  const renderTransactionDetails = () => {
    if (!transaction) return null;

    if (compact) {
      switch (transaction.txType) {
        case "pay":
          return renderPaymentDetailsCompact(transaction);
        case "appl":
          return renderApplicationCallCompact(transaction);
        case "axfer":
          return renderAssetTransferCompact(transaction);
        case "stpf":
          return renderStateProofCompact(transaction);
        default:
          return (
            <Card>
              <CardBody>
                <Stack spacing={2}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Badge
                        colorScheme={getTransactionBadgeColor(
                          transaction.txType
                        )}
                        mb={1}
                      >
                        {getTransactionType(transaction.txType)}
                      </Badge>
                    </Box>
                    {transaction.paymentTransaction && (
                      <Text fontWeight="bold">
                        {(
                          Number(transaction.paymentTransaction.amount) /
                          1_000_000
                        ).toFixed(6)}{" "}
                        VOI
                      </Text>
                    )}
                  </Flex>
                  <SimpleGrid columns={2} spacing={2}>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        From
                      </Text>
                      <AddressDisplay address={transaction.sender} />
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.500">
                        To
                      </Text>
                      <AddressDisplay
                        address={
                          transaction.paymentTransaction?.receiver ||
                          transaction.assetTransferTransaction?.receiver ||
                          transaction.sender
                        }
                      />
                    </Box>
                  </SimpleGrid>
                </Stack>
              </CardBody>
            </Card>
          );
      }
    }

    switch (transaction.txType) {
      case "pay":
        return renderPaymentDetails(transaction);
      case "appl":
        return renderApplicationCall(transaction);
      case "axfer":
        return renderAssetTransfer(transaction);
      case "stpf":
        return renderStateProof(transaction);
      default:
        return (
          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Box>
                  <Badge>{transaction["tx-type"]}</Badge>
                  <TxIdDisplay txId={transaction.id} />
                </Box>
                <Divider />
                <Box>
                  <Text fontWeight="semibold">From</Text>
                  <Text fontFamily="mono">{transaction.sender}</Text>
                </Box>
                {transaction.note && renderNote(formatNote(transaction.note))}
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  rightIcon={
                    showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />
                  }
                  size="sm"
                  alignSelf="flex-start"
                >
                  {showDetails ? "Hide" : "Show"} Details
                </Button>
                {showDetails && (
                  <Stack direction="row" spacing={4} align="center">
                    <Text fontSize="sm" color="gray.500">
                      Fee: {(Number(transaction.fee) / 1_000_000).toFixed(6)}{" "}
                      VOI
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Round:{" "}
                      <Button
                        as="a"
                        href={`/block/${transaction.confirmedRound}`}
                        variant="link"
                        colorScheme="blue"
                        size="sm"
                      >
                        {transaction.confirmedRound.toString()}
                      </Button>
                    </Text>
                    {transaction.group && (
                      <Text fontSize="sm" color="gray.500">
                        Group:{" "}
                        <Button
                          as="a"
                          href={`/group/${Buffer.from(
                            transaction.group
                          ).toString("base64")}`}
                          variant="link"
                          colorScheme="blue"
                          size="sm"
                        >
                          {Buffer.from(transaction.group).toString("base64")}
                        </Button>
                      </Text>
                    )}
                    <Text fontSize="sm" color="gray.500">
                      Time:{" "}
                      {new Date(transaction.roundTime * 1000).toLocaleString()}
                    </Text>
                  </Stack>
                )}
                {renderExplorerLinks(transaction.id)}
              </Stack>
            </CardBody>
          </Card>
        );
    }
  };

  const getTransactionBadgeColor = (txType: string) => {
    switch (txType) {
      case "pay":
        return "green";
      case "appl":
        return "purple";
      case "axfer":
        return "blue";
      case "stpf":
        return "orange";
      default:
        return "gray";
    }
  };

  const getTransactionType = (txType: string) => {
    switch (txType) {
      case "pay":
        return "Payment";
      case "appl":
        return "Application";
      case "axfer":
        return "Asset Transfer";
      case "stpf":
        return "State Proof";
      default:
        return txType.toUpperCase();
    }
  };

  const parseUint64FromHex = (buffer: Buffer, offset: number = 0): string => {
    return BigInt(
      "0x" + buffer.slice(offset, offset + 32).toString("hex")
    ).toString();
  };

  const parseSwapEvent = (log: Uint8Array): SwapEventData => {
    const eventBuffer = Buffer.from(log);

    // Skip first 4 bytes (selector)
    const who = algosdk.encodeAddress(
      Uint8Array.from(eventBuffer.slice(4, 36))
    );

    // Parse swap amounts (36-164)
    const swapIn = {
      a: parseUint64FromHex(eventBuffer, 36),
      b: parseUint64FromHex(eventBuffer, 68),
    };

    const swapOut = {
      a: parseUint64FromHex(eventBuffer, 100),
      b: parseUint64FromHex(eventBuffer, 132),
    };

    // Parse pool balances (164-228)
    const poolBalances = {
      a: parseUint64FromHex(eventBuffer, 164),
      b: parseUint64FromHex(eventBuffer, 196),
    };

    return {
      who,
      swapIn,
      swapOut,
      poolBalances,
    };
  };

  const renderExplorerLinks = (txId: string) => {
    return (
      <Stack direction="row" spacing={4} align="center">
        <Text fontSize="sm" color="gray.500">
          View on:
        </Text>
        <Button
          as="a"
          href={`https://block.voi.network/explorer/transaction/${txId}`}
          variant="link"
          colorScheme="blue"
          size="sm"
          rightIcon={<ExternalLinkIcon />}
          target="_blank"
          rel="noopener noreferrer"
        >
          VoiBlockExplorer
        </Button>
        <Button
          as="a"
          href={`https://explorer.voi.network/explorer/transaction/${txId}`}
          variant="link"
          colorScheme="blue"
          size="sm"
          rightIcon={<ExternalLinkIcon />}
          target="_blank"
          rel="noopener noreferrer"
        >
          VoiExplorer
        </Button>
        <Button
          as="a"
          href={`https://voi.observer/explorer/transaction/${txId}`}
          variant="link"
          colorScheme="blue"
          size="sm"
          rightIcon={<ExternalLinkIcon />}
          target="_blank"
          rel="noopener noreferrer"
        >
          VoiObserver
        </Button>
      </Stack>
    );
  };

  return (
    <Stack spacing={compact ? 2 : 6} pt={compact ? 0 : 8}>
      {!compact && (
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
      )}
      {showRawData && transaction && (
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
                {JSON.stringify(
                  transaction,
                  (_, value) =>
                    typeof value === "bigint" ? value.toString() : value,
                  2
                )}
              </Code>
            </Box>
          </CardBody>
        </Card>
      )}
      {renderTransactionDetails()}
      {!compact && (
        <Box pt={4} textAlign="center">
          <Text color="gray.500" fontSize="sm" mb={2}>
            Found a new transaction type? Submit it for rewards!
          </Text>
          <Button
            as="a"
            href="https://docs.google.com/forms/d/e/1FAIpQLSdBliiztOgCibPldYoWPDZmmyiPKcvjY9VoFsxY0pxWuW8njg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            colorScheme="blue"
            size="sm"
            rightIcon={<ExternalLinkIcon />}
          >
            Submit Transaction Type
          </Button>
        </Box>
      )}
    </Stack>
  );
};

export default TransactionContainer;
