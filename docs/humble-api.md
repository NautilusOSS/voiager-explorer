# Humble API Documentation

## Overview

The Humble API provides access to the Humble DeFi protocol on the Voi network. This API enables developers to interact with Humble's decentralized exchange (DEX) and liquidity pools.

**Base URL:** `https://humble-api.voi.nautilus.sh`

**Interactive API Documentation:** [https://humble-api.voi.nautilus.sh/api-docs/](https://humble-api.voi.nautilus.sh/api-docs/)

## API Documentation

The Humble API uses OpenAPI/Swagger specification for documentation. You can access the interactive API documentation at the URL above, which provides:

- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication details (if required)

## Getting Started

### Base Endpoint

All API requests should be made to:
```
https://humble-api.voi.nautilus.sh
```

### API Documentation Endpoints

- **Interactive Docs:** `https://humble-api.voi.nautilus.sh/api-docs/`
- **OpenAPI Spec (if available):** `https://humble-api.voi.nautilus.sh/api-docs/swagger.json`

## API Endpoints

### Get Tokens

Retrieve a list of all tokens available on the Humble protocol.

**Endpoint:** `GET /tokens`

**URL:** `https://humble-api.voi.nautilus.sh/tokens`

**Response Format:** JSON

**Response Structure:**
```json
{
  "tokens": [
    {
      "assetId": "string",
      "name": "string",
      "unitName": "string",
      "decimals": "string",
      "totalSupply": "string",
      "lastUpdated": number
    }
  ],
  "count": number,
  "lastUpdated": number
}
```

**Response Fields:**
- `tokens` (array): List of token objects
  - `assetId` (string): Unique asset identifier on the Voi network
  - `name` (string): Full name of the token
  - `unitName` (string): Short unit name/symbol of the token
  - `decimals` (string): Number of decimal places for the token
  - `totalSupply` (string): Total supply of the token (as a string to handle large numbers)
  - `lastUpdated` (number): Block number when the token information was last updated
- `count` (number): Total number of tokens returned
- `lastUpdated` (number): Block number when the data was last updated

**Example Request:**
```bash
curl https://humble-api.voi.nautilus.sh/tokens
```

**Example Response:**
```json
{
  "tokens": [
    {
      "assetId": "390001",
      "name": "Wrapped Voi",
      "unitName": "wVOI",
      "decimals": "6",
      "totalSupply": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "lastUpdated": 13522917
    },
    {
      "assetId": "300279",
      "name": "Good Morning",
      "unitName": "GM",
      "decimals": "2",
      "totalSupply": "6900000000",
      "lastUpdated": 13522917
    }
  ],
  "count": 39,
  "lastUpdated": 13522917
}
```

**Usage Example:**
```typescript
// Fetch all tokens
const fetchTokens = async () => {
  try {
    const response = await fetch('https://humble-api.voi.nautilus.sh/tokens');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }
};

// Usage
const tokenData = await fetchTokens();
console.log(`Found ${tokenData.count} tokens`);
tokenData.tokens.forEach(token => {
  console.log(`${token.name} (${token.unitName}): ${token.assetId}`);
});
```

### Get Token Statistics

Retrieve detailed statistics for a specific token, including price, market cap, volume, and liquidity information.

**Endpoint:** `GET /tokens/{assetId}/stats`

**URL:** `https://humble-api.voi.nautilus.sh/tokens/{assetId}/stats`

**Parameters:**
- `assetId` (path parameter): The asset ID of the token

**Response Format:** JSON

**Response Structure:**
```json
{
  "assetId": "string",
  "token": {
    "assetId": "string",
    "name": "string",
    "unitName": "string",
    "decimals": "string",
    "totalSupply": "string",
    "lastUpdated": number
  },
  "price": {
    "usd": "string",
    "voi": "string",
    "quoteTokenId": "string"
  },
  "priceChange": {
    "24h": {
      "percent": "string",
      "absolute": "string"
    }
  },
  "marketCap": {
    "usd": "string"
  },
  "volume": {
    "24h": {
      "usdVolume": "string"
    }
  },
  "liquidity": {
    "totalUSD": "string",
    "pools": number
  },
  "lastUpdated": number
}
```

**Response Fields:**
- `assetId` (string): The asset ID of the token
- `token` (object): Basic token information
  - `assetId` (string): Unique asset identifier
  - `name` (string): Full name of the token
  - `unitName` (string): Token symbol
  - `decimals` (string): Number of decimal places
  - `totalSupply` (string): Total supply of the token
  - `lastUpdated` (number): Block number when last updated
- `price` (object): Current price information
  - `usd` (string): Price in USD
  - `voi` (string): Price in VOI
  - `quoteTokenId` (string): ID of the quote token used for pricing
- `priceChange` (object): Price change data
  - `24h` (object): 24-hour price change
    - `percent` (string): Percentage change
    - `absolute` (string): Absolute price change
- `marketCap` (object): Market capitalization
  - `usd` (string): Market cap in USD
- `volume` (object): Trading volume data
  - `24h` (object): 24-hour volume
    - `usdVolume` (string): Volume in USD
- `liquidity` (object): Liquidity information
  - `totalUSD` (string): Total liquidity in USD
  - `pools` (number): Number of liquidity pools
- `lastUpdated` (number): Block number when the data was last updated

**Example Request:**
```bash
curl https://humble-api.voi.nautilus.sh/tokens/419000/stats
```

**Example Response:**
```json
{
  "assetId": "419000",
  "token": {
    "assetId": "419000",
    "name": "Chris Thank You Token",
    "unitName": "CTYT",
    "decimals": "6",
    "totalSupply": "100000000000000",
    "lastUpdated": 13522917
  },
  "price": {
    "usd": "0.003650",
    "voi": "8.64866979655712",
    "quoteTokenId": "390001"
  },
  "priceChange": {
    "24h": {
      "percent": "0.00",
      "absolute": "0.000000"
    }
  },
  "marketCap": {
    "usd": "365022.27"
  },
  "volume": {
    "24h": {
      "usdVolume": "0.02"
    }
  },
  "liquidity": {
    "totalUSD": "4.87",
    "pools": 2
  },
  "lastUpdated": 13522917
}
```

**Usage Example:**
```typescript
// Fetch token statistics
const fetchTokenStats = async (assetId: string) => {
  try {
    const response = await fetch(
      `https://humble-api.voi.nautilus.sh/tokens/${assetId}/stats`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token stats:', error);
    throw error;
  }
};

// Usage
const stats = await fetchTokenStats('419000');
console.log(`Token: ${stats.token.name}`);
console.log(`Price: $${stats.price.usd} (${stats.price.voi} VOI)`);
console.log(`Market Cap: $${stats.marketCap.usd}`);
console.log(`24h Volume: $${stats.volume['24h'].usdVolume}`);
console.log(`Liquidity: $${stats.liquidity.totalUSD} (${stats.liquidity.pools} pools)`);
```

## Common Use Cases

The Humble API typically provides endpoints for:

1. **Pool Information**
   - Get pool details
   - List all pools
   - Pool statistics

2. **Token Information**
   - Token metadata
   - Token prices
   - Token supply information

3. **Transaction Data**
   - Swap transactions
   - Liquidity transactions
   - Historical data

4. **Market Data**
   - Price charts
   - Volume statistics
   - TVL (Total Value Locked)

## Integration Examples

### Using Fetch API

```typescript
// Example: Fetching tokens
const fetchTokens = async () => {
  try {
    const response = await fetch('https://humble-api.voi.nautilus.sh/tokens');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    throw error;
  }
};

// Example: Fetching pool information
const fetchPoolInfo = async (poolId: string) => {
  try {
    const response = await fetch(
      `https://humble-api.voi.nautilus.sh/api/pools/${poolId}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pool info:', error);
    throw error;
  }
};
```

### Using Axios

```typescript
import axios from 'axios';

const humbleApi = axios.create({
  baseURL: 'https://humble-api.voi.nautilus.sh',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Example: Fetch tokens
const getTokens = async () => {
  const response = await humbleApi.get('/tokens');
  return response.data;
};

// Example: Fetch pool information
const getPoolInfo = async (poolId: string) => {
  const response = await humbleApi.get(`/api/pools/${poolId}`);
  return response.data;
};
```

## Error Handling

The API follows standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

Please refer to the interactive API documentation for information about rate limits and usage policies.

## Network Information

- **Network:** Voi Mainnet
- **Chain ID:** Varies (check current network configuration)

## Additional Resources

- **Humble Protocol:** [Nautilus Documentation](https://nautilus.sh)
- **Voi Network:** [Voi Documentation](https://voi.network)

## Notes

- Always check the interactive API documentation for the most up-to-date endpoint information
- The API may require authentication for certain endpoints
- Response formats may vary by endpoint - refer to the Swagger documentation for specific schemas

## Support

For API support and questions:
- Visit the interactive API documentation
- Check the Nautilus documentation
- Review the Voi network resources

