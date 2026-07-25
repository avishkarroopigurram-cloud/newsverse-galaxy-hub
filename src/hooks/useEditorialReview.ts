import { useMutation } from "@tanstack/react-query";
import { runEditorialReview } from "@/lib/editorial.functions";
import type { ArticleDraftInput, EditorialReviewResult } from "@/types/editorial";

export function useEditorialReview() {
  return useMutation<EditorialReviewResult, Error, ArticleDraftInput>({
    mutationFn: (draft) => runEditorialReview({ data: draft }),
  });
}
