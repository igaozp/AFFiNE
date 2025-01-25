import {
  EmbedFigmaBlockComponent,
  EmbedGithubBlockComponent,
  EmbedHtmlBlockComponent,
  EmbedLinkedDocBlockComponent,
  EmbedLoomBlockComponent,
  EmbedSyncedDocBlockComponent,
  EmbedYoutubeBlockComponent,
} from '@blocksuite/affine-block-embed';
import type {
  BookmarkBlockModel,
  EmbedFigmaModel,
  EmbedGithubModel,
  EmbedHtmlModel,
  EmbedLoomModel,
  EmbedYoutubeModel,
} from '@blocksuite/affine-model';
import {
  EmbedLinkedDocModel,
  EmbedSyncedDocModel,
} from '@blocksuite/affine-model';
import type { BlockComponent } from '@blocksuite/block-std';

import { BookmarkBlockComponent } from '../../bookmark-block';

export type ExternalEmbedBlockComponent =
  | BookmarkBlockComponent
  | EmbedFigmaBlockComponent
  | EmbedGithubBlockComponent
  | EmbedLoomBlockComponent
  | EmbedYoutubeBlockComponent;

export type InternalEmbedBlockComponent =
  | EmbedLinkedDocBlockComponent
  | EmbedSyncedDocBlockComponent;

export type LinkableEmbedBlockComponent =
  | ExternalEmbedBlockComponent
  | InternalEmbedBlockComponent;

export type BuiltInEmbedBlockComponent =
  | LinkableEmbedBlockComponent
  | EmbedHtmlBlockComponent;

export type ExternalEmbedModel =
  | BookmarkBlockModel
  | EmbedFigmaModel
  | EmbedGithubModel
  | EmbedLoomModel
  | EmbedYoutubeModel;

export type InternalEmbedModel = EmbedLinkedDocModel | EmbedSyncedDocModel;

export type LinkableEmbedModel = ExternalEmbedModel | InternalEmbedModel;

export type BuiltInEmbedModel = LinkableEmbedModel | EmbedHtmlModel;

export function isEmbedCardBlockComponent(
  block: BlockComponent
): block is BuiltInEmbedBlockComponent {
  return (
    block instanceof BookmarkBlockComponent ||
    block instanceof EmbedFigmaBlockComponent ||
    block instanceof EmbedGithubBlockComponent ||
    block instanceof EmbedHtmlBlockComponent ||
    block instanceof EmbedLoomBlockComponent ||
    block instanceof EmbedYoutubeBlockComponent ||
    block instanceof EmbedLinkedDocBlockComponent ||
    block instanceof EmbedSyncedDocBlockComponent
  );
}

export function isInternalEmbedModel(
  model: BuiltInEmbedModel
): model is InternalEmbedModel {
  return (
    model instanceof EmbedLinkedDocModel || model instanceof EmbedSyncedDocModel
  );
}
