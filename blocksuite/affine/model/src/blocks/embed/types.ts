import { EmbedFigmaModel } from './figma';
import { EmbedGithubModel } from './github';
import type { EmbedHtmlModel } from './html';
import { EmbedLinkedDocModel } from './linked-doc';
import { EmbedLoomModel } from './loom';
import { EmbedSyncedDocModel } from './synced-doc';
import { EmbedYoutubeModel } from './youtube';

export type ExternalEmbedModel =
  | EmbedFigmaModel
  | EmbedGithubModel
  | EmbedLoomModel
  | EmbedYoutubeModel;

export type InternalEmbedModel = EmbedLinkedDocModel | EmbedSyncedDocModel;

export type LinkableEmbedModel = ExternalEmbedModel | InternalEmbedModel;

export type BuiltInEmbedModel = LinkableEmbedModel | EmbedHtmlModel;

export function isExternalEmbedModel(
  model: BuiltInEmbedModel
): model is ExternalEmbedModel {
  return (
    model instanceof EmbedFigmaModel ||
    model instanceof EmbedGithubModel ||
    model instanceof EmbedLoomModel ||
    model instanceof EmbedYoutubeModel
  );
}

export function isInternalEmbedModel(
  model: BuiltInEmbedModel
): model is InternalEmbedModel {
  return (
    model instanceof EmbedLinkedDocModel || model instanceof EmbedSyncedDocModel
  );
}
