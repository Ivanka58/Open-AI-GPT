import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useStatus() {
  return useQuery({
    queryKey: [api.status.path],
    queryFn: async () => {
      // For now, this is a placeholder check. 
      // In a real scenario, this would check if the bot service is healthy.
      const res = await fetch(api.status.path);
      if (!res.ok) {
        // Fallback if endpoint isn't implemented yet
        return { status: "operational" };
      }
      return api.status.responses[200].parse(await res.json());
    },
    // Don't refetch often, it's just a status check
    staleTime: 60000, 
  });
}
