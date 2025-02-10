interface Holder {
  address: string;
  balance: string;
  percentage: number;
}

export const fetchHolders = async (contractId: string): Promise<Holder[]> => {
  try {
    // Replace this URL with your actual API endpoint
    const response = await fetch(`/api/holders/${contractId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch holders data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching holders:', error);
    throw error;
  }
}; 