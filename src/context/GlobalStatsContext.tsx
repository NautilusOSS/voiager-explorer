import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface GlobalStats {
  averageBlockTime: number;
  totalBlocksAnalyzed: number;
  diffCache: number[];
  latestBlock: number | null;
  circulatingSupply: string;
  distributedSupply: string;
  percentDistributed: string;
}

interface GlobalStatsAction {
  type: 'UPDATE_STATS' | 'UPDATE_SUPPLY';
  payload: {
    averageBlockTime?: number;
    totalBlocksAnalyzed: number;
    newDiffs: number[];
    latestBlock: number | null;
    circulatingSupply?: string;
    distributedSupply?: string;
    percentDistributed?: string;
  };
}

const initialState: GlobalStats = {
  averageBlockTime: 0,
  totalBlocksAnalyzed: 0,
  diffCache: [],
  latestBlock: null,
  circulatingSupply: "0",
  distributedSupply: "0",
  percentDistributed: "0",
};

const MAX_DIFF_CACHE_SIZE = 100;

function globalStatsReducer(state: GlobalStats, action: GlobalStatsAction): GlobalStats {
  switch (action.type) {
    case 'UPDATE_STATS': {
      const newDiffs = action.payload.newDiffs || [];
      const newDiffCache = [...state.diffCache, ...newDiffs];
      const trimmedDiffCache = newDiffCache.slice(-MAX_DIFF_CACHE_SIZE);
      const averageBlockTime = trimmedDiffCache.length > 0
        ? trimmedDiffCache.reduce((sum, diff) => sum + diff, 0) / trimmedDiffCache.length
        : 0;

      return {
        averageBlockTime,
        totalBlocksAnalyzed: action.payload.totalBlocksAnalyzed,
        diffCache: trimmedDiffCache,
        latestBlock: action.payload.latestBlock,
        circulatingSupply: state.circulatingSupply,
        distributedSupply: state.distributedSupply,
        percentDistributed: state.percentDistributed,
      };
    }
    case 'UPDATE_SUPPLY': {
      return {
        ...state,
        circulatingSupply: action.payload.circulatingSupply || state.circulatingSupply,
        distributedSupply: action.payload.distributedSupply || state.distributedSupply,
        percentDistributed: action.payload.percentDistributed || state.percentDistributed,
      };
    }
    default:
      return state;
  }
}

const GlobalStatsContext = createContext<{
  state: GlobalStats;
  dispatch: React.Dispatch<GlobalStatsAction>;
} | undefined>(undefined);

export function GlobalStatsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(globalStatsReducer, initialState);

  return (
    <GlobalStatsContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalStatsContext.Provider>
  );
}

export function useGlobalStats() {
  const context = useContext(GlobalStatsContext);
  if (context === undefined) {
    throw new Error('useGlobalStats must be used within a GlobalStatsProvider');
  }
  return context;
} 