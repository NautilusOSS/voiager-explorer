interface SupplyResponse {
  circulatingSupply: string;
  distributedSupply: string;
  percentDistributed: string;
  lockedAccounts: string[];
  distributingAccounts: string[];
}

export const getSupplyInfo = async (): Promise<SupplyResponse> => {
  try {
    const response = await fetch('https://circulating.voi.network/api/circulating-supply');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching supply info:', error);
    throw error;
  }
}; 