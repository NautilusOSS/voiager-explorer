import { ChakraProvider, Box } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Block from "./components/Block";
import Transaction from "./components/Transaction";
import { GlobalStatsProvider } from "./context/GlobalStatsContext";

function App() {
  return (
    <ChakraProvider>
      <GlobalStatsProvider>
        <BrowserRouter>
          <Box minH="100vh" w="100vw" bg="gray.50" _dark={{ bg: "gray.900" }} overflowX="hidden">
            <Header />
            <Box w="100%" px={{ base: 2, md: 4 }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/block/:round" element={<Block />} />
                <Route path="/transaction/:txId" element={<Transaction />} />
              </Routes>
            </Box>
          </Box>
        </BrowserRouter>
      </GlobalStatsProvider>
    </ChakraProvider>
  );
}

export default App;
