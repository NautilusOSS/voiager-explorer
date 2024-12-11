import React from "react";
import {
  Flex,
  Box,
  Text,
  HStack,
  Link,
  Image,
  IconButton,
  VStack,
  Collapse,
  useDisclosure,
  SlideFade,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Divider,
} from "@chakra-ui/react";
import { HamburgerIcon, CloseIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useLocation } from "react-router-dom";

const Navigation: React.FC = () => {
  const location = useLocation();
  const { isOpen, onToggle } = useDisclosure();

  const NavLink = ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <Link
      as={RouterLink}
      to={to}
      px={4}
      py={2}
      rounded="md"
      fontWeight="medium"
      color={location.pathname === to ? "blue.500" : "gray.600"}
      _hover={{
        textDecoration: "none",
        bg: "gray.100",
      }}
      _dark={{
        color: location.pathname === to ? "blue.300" : "gray.300",
        _hover: {
          bg: "gray.700",
        },
      }}
      w={{ base: "full", md: "auto" }}
      display="flex"
      alignItems="center"
      justifyContent={{ base: "flex-start", md: "center" }}
    >
      {children}
    </Link>
  );

  const isBlockchainActive = [
    "/blocks",
    "/transactions",
    "/accounts",
    "/top-accounts",
    "/applications",
  ].includes(location.pathname);

  return (
    <Box
      w="100%"
      borderBottom="1px"
      borderColor="gray.200"
      bg="white"
      position="relative"
      _dark={{
        borderColor: "gray.700",
        bg: "gray.800",
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        py={3}
        px={{ base: 2, md: 4 }}
        maxW="8xl"
        mx="auto"
        w="100%"
      >
        <Link
          as={RouterLink}
          to="/"
          display="flex"
          alignItems="center"
          _hover={{ textDecoration: "none" }}
        >
          <Image src="/logo.png" alt="Voi Logo" h="32px" w="32px" mr={3} />
          <Text
            fontSize="xl"
            fontWeight="bold"
            bgGradient="linear(to-r, blue.400, blue.600)"
            bgClip="text"
          >
            Block Explorer
          </Text>
        </Link>

        {/* Mobile Menu Button */}
        <IconButton
          display={{ base: "flex", md: "none" }}
          onClick={onToggle}
          icon={
            isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
          }
          variant="ghost"
          aria-label="Toggle Navigation"
          color="gray.600"
          _dark={{ color: "gray.300" }}
          _hover={{
            bg: "gray.100",
            _dark: { bg: "gray.700" },
          }}
        />

        {/* Desktop Navigation */}
        <HStack spacing={1} display={{ base: "none", md: "flex" }}>
          <NavLink to="/">Home</NavLink>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              px={4}
              py={2}
              fontWeight="medium"
              color={isBlockchainActive ? "blue.500" : "gray.600"}
              _hover={{
                bg: "gray.100",
              }}
              _dark={{
                color: isBlockchainActive ? "blue.300" : "gray.300",
                _hover: {
                  bg: "gray.700",
                },
              }}
            >
              Blockchain
            </MenuButton>
            <MenuList>
              <MenuItem as={RouterLink} to="/blocks">
                Blocks
              </MenuItem>
              <MenuItem as={RouterLink} to="/transactions">
                Transactions
              </MenuItem>
              <MenuItem as={RouterLink} to="/accounts">
                Accounts
              </MenuItem>
              <MenuItem as={RouterLink} to="/applications">
                Applications
              </MenuItem>
              <Divider />
              <MenuItem as={RouterLink} to="/top-accounts">
                Top Accounts
              </MenuItem>
            </MenuList>
          </Menu>
          <NavLink to="/tokens">Tokens</NavLink>
        </HStack>
      </Flex>

      {/* Mobile Navigation Dropdown */}
      <SlideFade in={isOpen} offsetY="-20px">
        <Collapse in={isOpen} animateOpacity>
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            bg="white"
            borderBottomRadius="md"
            boxShadow="md"
            _dark={{
              bg: "gray.800",
              boxShadow: "dark-lg",
            }}
            zIndex={10}
          >
            <VStack
              spacing={0}
              divider={
                <Box
                  w="100%"
                  h="1px"
                  bg="gray.100"
                  _dark={{ bg: "gray.700" }}
                />
              }
              py={2}
            >
              <NavLink to="/">Home</NavLink>
              <NavLink to="/blocks">Blocks</NavLink>
              <NavLink to="/transactions">Transactions</NavLink>
              <NavLink to="/accounts">Accounts</NavLink>
              <NavLink to="/applications">Applications</NavLink>
              <Box w="100%" h="2px" bg="gray.200" _dark={{ bg: "gray.600" }} />
              <NavLink to="/top-accounts">Top Accounts</NavLink>
              <NavLink to="/tokens">Tokens</NavLink>
            </VStack>
          </Box>
        </Collapse>
      </SlideFade>
    </Box>
  );
};

export default Navigation;
