import algosdk from "algosdk";
import {
  VOI_MAINNET_ALGOD_SERVER,
  VOI_MAINNET_ALGOD_TOKEN,
  VOI_MAINNET_ALGOD_PORT,
  VOI_MAINNET_INDEXER_SERVER,
  VOI_MAINNET_INDEXER_TOKEN,
  VOI_MAINNET_INDEXER_PORT,
} from "../config/constants";

export const algodClient = new algosdk.Algodv2(
  VOI_MAINNET_ALGOD_TOKEN,
  VOI_MAINNET_ALGOD_SERVER,
  VOI_MAINNET_ALGOD_PORT
);
export const indexerClient = new algosdk.Indexer(
  VOI_MAINNET_INDEXER_TOKEN,
  VOI_MAINNET_INDEXER_SERVER,
  VOI_MAINNET_INDEXER_PORT
);

// Add this at the top of the file with other imports
interface BlockCache {
  block: any; // Replace 'any' with proper block type if available
  timestamp: number;
}

// Add this cache array outside of the function to persist between calls
let blockCache: BlockCache[] = [];
const MAX_CACHE_SIZE = 100;

let diffCache: number[] = [];
const MAX_DIFF_CACHE_SIZE = 100;

export const getLatestBlocks = async (limit: number = 10) => {
  try {
    const status = await algodClient.status().do();
    let lastRound = BigInt(status.lastRound);

    const blocks = [];
    for (let i = 0; i < limit; i++) {
      const roundNumber = lastRound - BigInt(i);
      const block = await algodClient.block(Number(roundNumber)).do();
      blocks.push(block);
    }

    // Calculate time differences
    const timeDiffs = [];
    if (blocks.length >= 2) {
      for (let i = 0; i < blocks.length - 1; i++) {
        const currentBlock = blocks[i].block.header.timestamp;
        const nextBlock = blocks[i + 1].block.header.timestamp;
        const timeDiff = Number(currentBlock - nextBlock);
        if (timeDiff > 0) {
          timeDiffs.push(timeDiff);
        }
      }
    }

    return {
      blocks,
      newDiffs: timeDiffs,
      totalBlocksAnalyzed: blocks.length,
    };
  } catch (error) {
    console.error("Error fetching latest blocks:", error);
    throw error;
  }
};

console.log({ blockCache });

export const getTransaction = async (txId: string) => {
  try {
    const transaction = await indexerClient.lookupTransactionByID(txId).do();
    return transaction;
  } catch (error) {
    console.error("Error fetching transaction:", error);
    throw error;
  }
};

export const getAccount = async (address: string) => {
  try {
    const account = await indexerClient.lookupAccountByID(address).do();
    return account;
  } catch (error) {
    console.error("Error fetching account:", error);
    throw error;
  }
};
