import { useCallback, useState } from "react";

export function useSelectedAnnotationState(initialValue: string | null = null) {
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(initialValue);

  const syncWithIds = useCallback((candidateIds: string[]) => {
    setSelectedAnnotationId((current) => {
      if (current && candidateIds.includes(current)) {
        return current;
      }

      return candidateIds[0] ?? null;
    });
  }, []);

  return {
    selectedAnnotationId,
    setSelectedAnnotationId,
    syncWithIds,
  };
}
