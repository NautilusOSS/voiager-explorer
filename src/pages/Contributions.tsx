import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  UnorderedList,
  ListItem,
  Link,
  Card,
  CardBody,
  SimpleGrid,
  Flex,
  Badge,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link as RouterLink } from "react-router-dom";

const Contributions = () => {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const contributors = [
    {
      name: "Shelly",
      github: "temptemp3",
      role: "Project Lead & Main Developer",
      contributions: [
        "Initial project setup",
        "Core explorer functionality",
        "UI/UX design",
        "Block explorer implementation",
        "Transaction handling",
      ],
      address: "G3MSA75OZEJTCCENOJDLDJK7UD7E2K5DNC7FVHCNOV7E3I4DTXTOWDUIFQ",
    },
  ];

  return (
    <Container maxW="8xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={4}>
            Contributors
          </Heading>
          <Text>
            Voiager Block Explorer is an open-source project. We appreciate all
            contributions that help improve the explorer.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {contributors.map((contributor) => (
            <Card
              key={contributor.github}
              bg={cardBg}
              borderWidth="1px"
              borderColor={borderColor}
            >
              <CardBody>
                <VStack align="start" spacing={4}>
                  <Flex width="100%" justify="space-between" align="center">
                    <Box>
                      <Heading size="md">{contributor.name}</Heading>
                      <Link
                        href={`https://github.com/${contributor.github}`}
                        isExternal
                        color="blue.500"
                        fontSize="sm"
                      >
                        @{contributor.github} <ExternalLinkIcon mx="2px" />
                      </Link>
                    </Box>
                    {/*<Avatar
                      size="md"
                      src={`https://github.com/${contributor.github}.png`}
                    />*/}
                  </Flex>
                  <Badge colorScheme="purple">{contributor.role}</Badge>
                  <UnorderedList pl={4} spacing={1}>
                    {contributor.contributions.map((contribution, index) => (
                      <ListItem key={index}>{contribution}</ListItem>
                    ))}
                  </UnorderedList>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        <Divider />

        <Box>
          <Heading size="lg" mb={4}>
            How to Contribute
          </Heading>
          <VStack align="stretch" spacing={4}>
            <Text>
              We welcome contributions from the community. Here's how you can
              help:
            </Text>
            <UnorderedList spacing={2} pl={4}>
              <ListItem>
                <Text fontWeight="bold">Report Bugs</Text>
                <Text>
                  Found a bug? Open an issue on our{" "}
                  <Link
                    href="https://github.com/nicholasp23/voi-explorer/issues"
                    isExternal
                    color="blue.500"
                  >
                    GitHub repository <ExternalLinkIcon mx="2px" />
                  </Link>
                </Text>
              </ListItem>
              <ListItem>
                <Text fontWeight="bold">Suggest Features</Text>
                <Text>
                  Have an idea for a new feature? Share it in our GitHub
                  discussions.
                </Text>
              </ListItem>
              <ListItem>
                <Text fontWeight="bold">Submit Pull Requests</Text>
                <Text>
                  Want to contribute code? Fork the repository and submit a pull
                  request.
                </Text>
              </ListItem>
              <ListItem>
                <Text fontWeight="bold">Improve Documentation</Text>
                <Text>Help us improve our documentation and guides.</Text>
              </ListItem>
            </UnorderedList>
          </VStack>
        </Box>

        <Box>
          <Heading size="lg" mb={4}>
            Development Setup
          </Heading>
          <VStack align="stretch" spacing={4}>
            <Text>To set up the project locally:</Text>
            <Box
              bg={useColorModeValue("gray.50", "gray.900")}
              p={4}
              borderRadius="md"
              fontFamily="mono"
            >
              <Text>
                git clone https://github.com/nicholasp23/voi-explorer.git
              </Text>
              <Text>cd voi-explorer</Text>
              <Text>npm install</Text>
              <Text>npm run dev</Text>
            </Box>
          </VStack>
        </Box>

        <Box>
          <Heading size="lg" mb={4}>
            Project History
          </Heading>
          <Text>
            View our detailed project history and updates in our{" "}
            <Link
              as={RouterLink}
              to="/changelog"
              color="blue.500"
              _hover={{ textDecoration: "underline" }}
            >
              changelog
            </Link>
            .
          </Text>
        </Box>
      </VStack>
    </Container>
  );
};

export default Contributions;
