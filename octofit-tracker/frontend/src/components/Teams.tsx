import { CapabilityCard } from './CapabilityCard.js';

import { getJson } from '../api/client.js';

type Team = { name: string; members: string[] };
const loadTeams = () => getJson<{ teams: Team[] }>('/api/teams').then(({ teams }) => teams);

export default function Teams() {
  return (
    <CapabilityCard
      title="Teams"
      description="Manage teams and members."
      emptyText="No teams yet."
      load={loadTeams}
      renderItem={(team) => `${team.name} - members: ${team.members.join(', ')}`}
    />
  );
}
