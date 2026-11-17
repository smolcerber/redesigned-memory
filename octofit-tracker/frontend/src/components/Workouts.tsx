import { CapabilityCard } from './CapabilityCard.js';

import { getJson } from '../api/client.js';

type Suggestion = { title: string; reason: string };
const loadSuggestions = () => getJson<{ suggestions: Suggestion[] }>(
  `/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`,
).then(({ suggestions }) => suggestions);

export default function Workouts() {
  return (
    <CapabilityCard
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      emptyText="No workout suggestions yet."
      load={loadSuggestions}
      renderItem={(suggestion) => `${suggestion.title}: ${suggestion.reason}`}
    />
  );
}
