import { notify } from '@affine/component';
import { ServerService } from '@affine/core/modules/cloud';
import { toURLSearchParams } from '@affine/core/modules/navigation';
import { copyTextToClipboard } from '@affine/core/utils/clipboard';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { type EditorHost } from '@blocksuite/affine/block-std';
import { GfxBlockElementModel } from '@blocksuite/affine/block-std/gfx';
import type { DocMode, EdgelessRootService } from '@blocksuite/affine/blocks';
import { useService } from '@toeverything/infra';
import { useCallback } from 'react';

export type UseSharingUrl = {
  workspaceId: string;
  pageId: string;
  mode?: DocMode;
  blockIds?: string[];
  elementIds?: string[];
  xywh?: string; // not needed currently
};

/**
 * To generate a url like
 *
 * https://app.affine.pro/workspace/workspaceId/docId?mode=DocMode&elementIds=seletedElementIds&blockIds=selectedBlockIds
 */
export const generateUrl = ({
  baseUrl,
  workspaceId,
  pageId,
  blockIds,
  elementIds,
  mode,
  xywh, // not needed currently
}: UseSharingUrl & { baseUrl: string }) => {
  try {
    const url = new URL(`/workspace/${workspaceId}/${pageId}`, baseUrl);
    const search = toURLSearchParams({ mode, blockIds, elementIds, xywh });
    if (search?.size) url.search = search.toString();
    return url.toString();
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

const getShareLinkType = ({
  mode,
  blockIds,
  elementIds,
}: {
  mode?: DocMode;
  blockIds?: string[];
  elementIds?: string[];
}) => {
  if (mode === 'page') {
    return 'doc';
  } else if (mode === 'edgeless') {
    return 'whiteboard';
  } else if (blockIds && blockIds.length > 0) {
    return 'block';
  } else if (elementIds && elementIds.length > 0) {
    return 'element';
  } else {
    return 'default';
  }
};

export const getSelectedNodes = (
  host: EditorHost | null,
  mode: DocMode = 'page'
) => {
  const std = host?.std;
  const blockIds: string[] = [];
  const elementIds: string[] = [];
  const result = { blockIds, elementIds };

  if (!std) {
    return result;
  }

  if (mode === 'edgeless') {
    const service = std.getService<EdgelessRootService>('affine:page');
    if (!service) return result;

    for (const element of service.selection.selectedElements) {
      if (element instanceof GfxBlockElementModel) {
        blockIds.push(element.id);
      } else {
        elementIds.push(element.id);
      }
    }

    return result;
  }

  const [success, ctx] = std.command
    .chain()
    .tryAll(chain => [
      chain.getTextSelection(),
      chain.getBlockSelections(),
      chain.getImageSelections(),
    ])
    .getSelectedModels({
      mode: 'highest',
    })
    .run();

  if (!success) {
    return result;
  }

  // should return an empty array if `to` of the range is null
  if (
    ctx.currentTextSelection &&
    !ctx.currentTextSelection.to &&
    ctx.currentTextSelection.from.length === 0
  ) {
    return result;
  }

  if (ctx.selectedModels?.length) {
    blockIds.push(...ctx.selectedModels.map(model => model.id));
    return result;
  }

  return result;
};

export const useSharingUrl = ({ workspaceId, pageId }: UseSharingUrl) => {
  const t = useI18n();
  const serverService = useService(ServerService);

  const onClickCopyLink = useCallback(
    (mode?: DocMode, blockIds?: string[], elementIds?: string[]) => {
      const sharingUrl = generateUrl({
        baseUrl: serverService.server.baseUrl,
        workspaceId,
        pageId,
        blockIds,
        elementIds,
        mode, // if view is not provided, use the current view
      });
      const type = getShareLinkType({
        mode,
        blockIds,
        elementIds,
      });
      if (sharingUrl) {
        copyTextToClipboard(sharingUrl)
          .then(success => {
            if (success) {
              notify.success({ title: t['Copied link to clipboard']() });
            }
          })
          .catch(err => {
            console.error(err);
          });
        track.$.sharePanel.$.copyShareLink({ type });
      } else {
        notify.error({ title: 'Network not available' });
      }
    },
    [pageId, serverService, t, workspaceId]
  );

  return {
    onClickCopyLink,
  };
};
