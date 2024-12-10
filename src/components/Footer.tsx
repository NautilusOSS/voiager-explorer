import React from "react";
import {
  Box,
  Container,
  Text,
  Link,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

const Footer: React.FC = () => {
  const donationAddress =
    "DM73QQJN2FMZ6UXDMSHLDN5Z2ZJITZJZULNUY5NP3YRR5QHFU54NU5XKII";

  // Color mode values
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const textColor = useColorModeValue("gray.600", "gray.400");

  return (
    <Box
      as="footer"
      py={4}
      mt={8}
      borderTopWidth="1px"
      borderColor={borderColor}
      bg={useColorModeValue("white", "gray.900")}
    >
      <Container maxW="8xl">
        <Flex
          justify="space-between"
          align="center"
          flexDir={{ base: "column", md: "row" }}
          gap={{ base: 4, md: 0 }}
        >
          <Flex align="center" gap={4}>
            <Text color={textColor}>Voiager © {new Date().getFullYear()}</Text>
            <Link
              as={RouterLink}
              to="/contributions"
              color={textColor}
              _hover={{ textDecoration: "underline" }}
            >
              Contribute
            </Link>
          </Flex>

          <Flex align="center" gap={2}>
            <Text color={textColor}>Donation Address:</Text>
            <Link
              as={RouterLink}
              to={`/account/${donationAddress}`}
              color={textColor}
              _hover={{ textDecoration: "underline" }}
              fontFamily="mono"
            >
              {donationAddress.slice(0, 6) + "..." + donationAddress.slice(-4)}{" "}
              ❤️
            </Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};

export default Footer;
