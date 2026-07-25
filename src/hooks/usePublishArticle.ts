import { useMutation } from "@tanstack/react-query";
import { publishArticle } from "@/lib/editorial.functions";
import type { PublishRequest, PublishResult } from "@/types/editorial";

export function usePublishArticle() {
  return useMutation<PublishResult, Error, PublishRequest>({
    mutationFn: (request) => publishArticle({ data: request }),
  });
}
