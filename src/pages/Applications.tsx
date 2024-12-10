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
  Button,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

interface Application {
  id: number;
  "created-at-round": number;
  deleted: boolean;
  params: {
    creator: string;
    "global-state": Array<{
      key: string;
      value: {
        bytes: string;
        type: number;
        uint: number;
      };
    }>;
  };
}

const Applications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);

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

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://mainnet-idx.voi.nodely.dev/v2/applications?limit=100"
      );
      const data = await response.json();
      setApplications(data.applications);
      setError(null);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleViewMore = () => {
    setDisplayCount((prev) => prev + 20);
  };

  if (loading) {
    return (
      <Container maxW="8xl" py={8}>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" />
        </Flex>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="8xl" py={8}>
        <Text color="red.500" textAlign="center">
          {error}
        </Text>
      </Container>
    );
  }

  return (
    <Container maxW="8xl" py={8}>
      <Stack spacing={6}>
        <Heading size="lg">Applications</Heading>

        <Stack spacing={4}>
          {applications.slice(0, displayCount).map((app) => (
            <Card
              key={app.id}
              onClick={() => navigate(`/application/${app.id}`)}
              cursor="pointer"
              _hover={{ transform: "translateY(-2px)", boxShadow: "lg" }}
              transition="all 0.2s"
            >
              <CardBody>
                <Stack spacing={4}>
                  <Flex justify="space-between" align="center">
                    <Box>
                      <Flex align="center" gap={2}>
                        <Badge colorScheme="purple">#{app.id}</Badge>
                        <Text fontSize="sm" color="gray.500">
                          Created at round {app["created-at-round"]}
                        </Text>
                      </Flex>
                      <Text mt={2} fontFamily="mono">
                        Creator: {formatAddress(app.params.creator)}
                      </Text>
                    </Box>
                    <Badge colorScheme={app.deleted ? "red" : "green"}>
                      {app.deleted ? "Deleted" : "Active"}
                    </Badge>
                  </Flex>

                  {/*app.params["global-state"].length > 0 && (
                    <Box>
                      <Text fontWeight="semibold" mb={2}>
                        Global State:
                      </Text>
                      <Stack>
                        {app.params["global-state"].map((state, index) => (
                          <Text key={index} fontSize="sm">
                            <Text as="span" fontWeight="bold">
                              {decodeBase64(state.key)}:
                            </Text>{" "}
                            {state.value.type === 1
                              ? decodeBase64(state.value.bytes)
                              : state.value.uint}
                          </Text>
                        ))}
                      </Stack>
                    </Box>
                  )*/}
                </Stack>
              </CardBody>
            </Card>
          ))}
        </Stack>

        {displayCount < applications.length && (
          <Flex justify="center" pt={4}>
            <Button onClick={handleViewMore} colorScheme="blue">
              View More
            </Button>
          </Flex>
        )}
      </Stack>
    </Container>
  );
};

export default Applications;
