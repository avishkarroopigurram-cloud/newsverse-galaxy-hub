import { useMemo, useState } from "react";
import { ArrowLeft, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/admin/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { QualityScoreCards } from "./QualityScoreCards";
import { HeadlineSuggestions } from "./HeadlineSuggestions";
import { HeroDecisionCard } from "./HeroDecisionCard";
import { RiskFlags } from "./RiskFlags";
import { PublishBar } from "./PublishBar";
import { usePublishArticle } from "@/hooks/usePublishArticle";
import type { EditorialReviewResult, PublishDestination } from "@/types/editorial";

export function ReviewScreen({
  result,
  heroImageDataUrl,
  onBack,
}: {
  result: EditorialReviewResult;
  heroImageDataUrl?: string;
  onBack: () => void;
}) {
  const [headline, setHeadline] = useState(result.headline);
  const [subheadline, setSubheadline] = useState(result.subheadline);
  const [content, setContent] = useState(result.content);
  const [destination, setDestination] = useState<PublishDestination>(
    result.suggestedDestination,
  );

  const publish = usePublishArticle();

  const seoWithHeadline = useMemo(
    () => ({ ...result.seo, seoTitle: result.seo.seoTitle || headline }),
    [result.seo, headline],
  );

  function handlePublish() {
    publish.mutate({
      destination,
      headline,
      subheadline,
      content,
      seo: seoWithHeadline,
      heroImageDataUrl,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-600 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to desk
        </Button>
        <div className="flex items-center gap-2 text-xs text-paper-700">
          <Clock className="h-3.5 w-3.5" />
          {result.estimatedReadingTimeMinutes} min read
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-transparent font-display text-2xl text-paper-100 focus:outline-none"
              />
              <input
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full bg-transparent text-sm text-paper-500 focus:outline-none"
              />
              {heroImageDataUrl && (
                <img
                  src={heroImageDataUrl}
                  className="max-h-64 w-full rounded-lg object-cover"
                  alt=""
                />
              )}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-paper-100 focus:outline-none"
              />
            </CardContent>
          </Card>

          {result.editedContentDiffNotes.length > 0 && (
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <ListChecks className="h-4 w-4 text-brass-500" />
                <CardTitle>What the AI Editor changed</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ul className="space-y-1.5 text-sm text-paper-500">
                  {result.editedContentDiffNotes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-brass-500">—</span> {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <RiskFlags factCheckFlags={result.factCheckFlags} legalFlags={result.legalFlags} />
        </div>

        <div className="space-y-4">
          <QualityScoreCards scores={result.scores} />

          <HeroDecisionCard
            recommendation={result.heroRecommendation}
            destination={destination}
            onChangeDestination={setDestination}
          />

          <Card>
            <CardHeader>
              <CardTitle>Headline options</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <HeadlineSuggestions
                suggestions={result.headlineSuggestions}
                selected={headline}
                onSelect={setHeadline}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-sm">
              <p className="text-paper-100">{result.seo.seoTitle}</p>
              <p className="text-paper-500">{result.seo.metaDescription}</p>
              <p className="font-mono text-xs text-brass-400">/{result.seo.slug}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {result.seo.tags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social posts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm text-paper-500">
              <p><span className="text-paper-300">X:</span> {result.socialPosts.x}</p>
              <p><span className="text-paper-300">Facebook:</span> {result.socialPosts.facebook}</p>
              <p><span className="text-paper-300">WhatsApp:</span> {result.socialPosts.whatsapp}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {publish.isError && (
        <p className="px-6 pb-2 text-sm text-danger-500">{publish.error.message}</p>
      )}

      <PublishBar
        destination={destination}
        isPublishing={publish.isPending}
        isPublished={publish.isSuccess}
        onPublish={handlePublish}
      />
    </div>
  );
}
