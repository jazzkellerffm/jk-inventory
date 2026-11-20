const stations = ['bar', 'backstage', 'service', 'door'] as const;
export type Station = typeof stations[number] | 'team';

// Combined assignments keep the same leading station as the duty roster.
export function stationFor(role = ''): Station {
  const label = role.trim().toLowerCase();
  return stations.find(station => label.startsWith(station)) ?? 'team';
}
