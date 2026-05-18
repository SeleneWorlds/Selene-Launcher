
export type JoinableServer = {
  apiUrl: string;
  name?: string;
};

export type ServerStatus = JoinableServer & {
  id: string;
  name: string;
  host?: string;
  port?: number;
  status: 'running';
  uptime: number;
  bundles: {
    total_count: number;
    client_count: number;
  },
  queueSize: number;
  maxQueueSize: number;
  currentPlayers: number;
  maxPlayers: number;
};

export type ListedServer = JoinableServer & {
  name: string;
  description: string;
  currentPlayers: number;
  maxPlayers: number;
  address?: string;
  port?: number;
};

export type FeaturedServer = ListedServer;

export type DedicatedServer = JoinableServer & {
  name: string;
  description: string;
  address: string;
  port: number;
};
