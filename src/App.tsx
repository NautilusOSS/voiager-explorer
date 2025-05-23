import { ChakraProvider, Box } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Block from "./components/Block";
import Transaction from "./components/Transaction";
import { GlobalStatsProvider } from "./context/GlobalStatsContext";
import Transactions from "./pages/Transactions";
import Blocks from "./pages/Blocks";
import Accounts from "./pages/Accounts";
import Account from "./pages/Account";
import Asset from "./pages/Asset";
import TopAccounts from "./pages/TopAccounts";
import Applications from "./pages/Applications";
import Application from "./pages/Application";
import Footer from "./components/Footer";
import Contributions from "./pages/Contributions";
import Changelog from "./pages/ChangeLog";
import TokenTracker from "./pages/TokenTracker";
import Token from "./pages/Token";

function App() {
  return (
    <ChakraProvider>
      <GlobalStatsProvider>
        <BrowserRouter>
          <Box
            minH="100vh"
            w="100vw"
            bg="gray.50"
            _dark={{ bg: "gray.900" }}
            overflowX="hidden"
            display="flex"
            flexDirection="column"
          >
            <Header />
            <Box w="100%" px={{ base: 2, md: 4 }} flex="1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blocks" element={<Blocks />} />
                <Route path="/block/:round" element={<Block />} />
                <Route path="/transaction/:txId" element={<Transaction />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/asset/:assetId" element={<Asset />} />
                <Route path="/applications" element={<Applications />} />
                <Route path="/top-accounts" element={<TopAccounts />} />
                <Route path="/account/:address" element={<Account />} />
                <Route path="/application/:id" element={<Application />} />
                <Route path="/contributions" element={<Contributions />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/tokens" element={<TokenTracker />} />
                <Route path="/token/:id" element={<Token />} />
              </Routes>
            </Box>
            <Footer />
          </Box>
        </BrowserRouter>
      </GlobalStatsProvider>
    </ChakraProvider>
  );
}

export default App;
