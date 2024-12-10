import {
  Box,
  Container,
  Heading,
  VStack,
  useColorModeValue,
  Link,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";

const Changelog = () => {
  const linkColor = useColorModeValue("blue.600", "blue.400");

  return (
    <Container maxW="8xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">Changelog</Heading>

        <Box>
          <Heading size="md" mb={4}>
            [0.1.0] - 2024-03-12
          </Heading>

          <Box mb={6}>
            <Heading size="sm" mb={2}>
              Added
            </Heading>
            <UnorderedList spacing={2}>
              <ListItem>
                Block Explorer functionality with block details view{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Transaction features including details page and type filtering{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Account features with balance display and transaction history{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Applications page with list view and details{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Load More functionality to transactions and applications{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Contributions page with contributor information{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Changelog page with commit history{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
            </UnorderedList>
          </Box>

          <Box mb={6}>
            <Heading size="sm" mb={2}>
              Changed
            </Heading>
            <UnorderedList spacing={2}>
              <ListItem>
                Updated footer layout with donation address and contribute link{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Improved data fetching mechanism for transactions{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Enhanced error handling across components{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Refined card interactions and hover effects{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
            </UnorderedList>
          </Box>

          <Box mb={6}>
            <Heading size="sm" mb={2}>
              Fixed
            </Heading>
            <UnorderedList spacing={2}>
              <ListItem>
                Dark/light mode consistency in footer{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Navigation between pages{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Footer spacing and alignment{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
              <ListItem>
                Transaction loading and pagination{" "}
                <Link
                  href="https://github.com/temptemp3"
                  isExternal
                  color={linkColor}
                  fontSize="sm"
                >
                  @temptemp3
                </Link>
              </ListItem>
            </UnorderedList>
          </Box>
        </Box>

        <Box mt={8}>
          <Heading size="md" mb={4}>
            Contributors
          </Heading>
          <UnorderedList>
            <ListItem>
              <Link
                href="https://github.com/temptemp3"
                isExternal
                color={linkColor}
              >
                @temptemp3
              </Link>{" "}
              - Nicholas Shellabarger - Project Lead & Main Developer
            </ListItem>
          </UnorderedList>
        </Box>
      </VStack>
    </Container>
  );
};

export default Changelog;
