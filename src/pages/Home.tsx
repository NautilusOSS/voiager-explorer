import React from "react";
import { Stack, Box, Container } from "@chakra-ui/react";
import GlobalStats from "../components/GlobalStats";
import LatestBlocks from "../components/LatestBlocks";
import LatestTransactions from "../components/LatestTransactions";

const Home: React.FC = () => {
  return (
    <Container maxW="8xl">
      <Stack spacing="8" py={8}>
        <GlobalStats />
        <Stack
          direction={{ base: "column", xl: "row" }}
          spacing={8}
          align="flex-start"
        >
          <Box flex={1} w="full" maxW={{ xl: "50%" }}>
            <LatestBlocks />
          </Box>
          <Box flex={1} w="full" maxW={{ xl: "50%" }}>
            <LatestTransactions />
          </Box>
        </Stack>
      </Stack>
    </Container>
  );
};

export default Home;
