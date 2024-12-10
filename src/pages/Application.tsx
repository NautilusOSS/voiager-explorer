import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Container,
  Stack,
  Text,
  Card,
  CardBody,
  Heading,
  Divider,
  Spinner,
  Badge,
  Flex,
  Button,
  Code,
  useColorModeValue,
  SimpleGrid,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";

interface ApplicationState {
  key: string;
  value: {
    bytes: string;
    type: number;
    uint: number;
  };
}

interface ApplicationData {
  "created-at-round": number;
  deleted: boolean;
  id: number;
  params: {
    "approval-program": string;
    "clear-state-program": string;
    creator: string;
    "global-state": ApplicationState[];
    "global-state-schema": {
      "num-byte-slice": number;
      "num-uint": number;
    };
    "local-state-schema": {
      "num-byte-slice": number;
      "num-uint": number;
    };
  };
}

const Application: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const bgColor = useColorModeValue("gray.50", "gray.900");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const decodeBase64 = (str: string) => {
    try {
      return atob(str);
    } catch (e) {
      return str;
    }
  };

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://mainnet-idx.voi.nodely.dev/v2/applications/${id}`
        );
        const data = await response.json();
        setApplication(data.application);
        setError(null);
      } catch (err) {
        console.error("Error fetching application:", err);
        setError("Failed to fetch application data");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchApplication();
    }
  }, [id]);

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error || !application) {
    return (
      <Box p={8} textAlign="center">
        <Text color="red.500">{error || "Application not found"}</Text>
      </Box>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">Application #{id}</Heading>
          <Button
            onClick={() => setShowRawData(!showRawData)}
            variant="ghost"
            rightIcon={showRawData ? <ChevronUpIcon /> : <ChevronDownIcon />}
            size="sm"
          >
            {showRawData ? "Hide" : "View"} Raw Data
          </Button>
        </Flex>

        {showRawData && (
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
                  {JSON.stringify(application, null, 2)}
                </Code>
              </Box>
            </CardBody>
          </Card>
        )}

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Heading size="md">Overview</Heading>
                <Divider />
                <Stack spacing={2}>
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Status</Text>
                    <Badge colorScheme={application.deleted ? "red" : "green"}>
                      {application.deleted ? "Deleted" : "Active"}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Created at Round</Text>
                    <Text>{application["created-at-round"]}</Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text fontWeight="bold">Creator</Text>
                    <Text fontFamily="mono">{formatAddress(application.params.creator)}</Text>
                  </Flex>
                </Stack>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack spacing={4}>
                <Heading size="md">Schema</Heading>
                <Divider />
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontWeight="bold">Global State Schema</Text>
                    <Text>Bytes: {application.params["global-state-schema"]["num-byte-slice"]}</Text>
                    <Text>Ints: {application.params["global-state-schema"]["num-uint"]}</Text>
                  </Box>
                  <Box>
                    <Text fontWeight="bold">Local State Schema</Text>
                    <Text>Bytes: {application.params["local-state-schema"]["num-byte-slice"]}</Text>
                    <Text>Ints: {application.params["local-state-schema"]["num-uint"]}</Text>
                  </Box>
                </SimpleGrid>
              </Stack>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Heading size="md">Global State</Heading>
              <Divider />
              {application.params["global-state"].length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {application.params["global-state"].map((state, index) => (
                    <Box key={index} p={4} borderWidth="1px" borderRadius="md">
                      <Text fontWeight="bold">{decodeBase64(state.key)}</Text>
                      <Text>
                        {state.value.type === 1
                          ? decodeBase64(state.value.bytes)
                          : state.value.uint}
                      </Text>
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500">No global state variables</Text>
              )}
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
};

export default Application; 