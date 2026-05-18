
export type JoinableServer = {
  apiUrl: string;
  name?: string;
};

export type ServerStatus = JoinableServer & {
  id: string;
  name: string;
  address: string;
  port: number;
  description: string;
  currentPlayers: number;
  maxPlayers: number;
};

export type Server = ServerStatus;
