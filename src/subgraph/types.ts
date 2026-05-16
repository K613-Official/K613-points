export interface ReserveSummary {
  id: string;
  symbol: string;
  decimals: number;
  underlyingAsset: string;
  aToken: { id: string };
  vToken: { id: string };
}

export interface ActiveReservesResponse {
  reserves: ReserveSummary[];
}

export interface UserReserveSummary {
  id: string;
  user: { id: string };
  reserve: {
    id: string;
    symbol: string;
    decimals: number;
    underlyingAsset: string;
  };
}

export interface UsersWithBalanceResponse {
  userReserves: UserReserveSummary[];
}

export interface ATokenHistoryItem {
  id: string;
  timestamp: number;
  scaledATokenBalance: string;
  currentATokenBalance: string;
  index: string;
}

export interface ATokenHistoryResponse {
  items: ATokenHistoryItem[];
  preItem: ATokenHistoryItem[];
}

export interface VTokenHistoryItem {
  id: string;
  timestamp: number;
  scaledVariableDebt: string;
  currentVariableDebt: string;
  index: string;
}

export interface VTokenHistoryResponse {
  items: VTokenHistoryItem[];
  preItem: VTokenHistoryItem[];
}

export interface ReserveParamsHistoryItem {
  id: string;
  timestamp: number;
  liquidityIndex: string;
  variableBorrowIndex: string;
}

export interface ReserveParamsHistoryResponse {
  items: ReserveParamsHistoryItem[];
  preItem: ReserveParamsHistoryItem[];
}
