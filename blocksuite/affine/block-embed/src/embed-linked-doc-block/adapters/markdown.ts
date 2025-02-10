import { EmbedLinkedDocBlockSchema } from '@blocksuite/affine-model';
import {
  BlockMarkdownAdapterExtension,
  type BlockMarkdownAdapterMatcher,
  TextUtils,
} from '@blocksuite/affine-shared/adapters';

export const embedLinkedDocBlockMarkdownAdapterMatcher: BlockMarkdownAdapterMatcher =
  {
    flavour: EmbedLinkedDocBlockSchema.model.flavour,
    toMatch: () => false,
    fromMatch: o => o.node.flavour === EmbedLinkedDocBlockSchema.model.flavour,
    toBlockSnapshot: {},
    fromBlockSnapshot: {
      enter: (o, context) => {
        const { configs, walkerContext } = context;
        // Parse as link
        if (!o.node.props.pageId) {
          return;
        }
        const title = configs.get('title:' + o.node.props.pageId) ?? 'untitled';
        const url = TextUtils.generateDocUrl(
          configs.get('docLinkBaseUrl') ?? '',
          String(o.node.props.pageId),
          o.node.props.params ?? Object.create(null)
        );
        walkerContext
          .openNode(
            {
              type: 'paragraph',
              children: [],
            },
            'children'
          )
          .openNode(
            {
              type: 'link',
              url,
              title: o.node.props.caption as string | null,
              children: [
                {
                  type: 'text',
                  value: title,
                },
              ],
            },
            'children'
          )
          .closeNode()
          .closeNode();
      },
    },
  };

export const EmbedLinkedDocMarkdownAdapterExtension =
  BlockMarkdownAdapterExtension(embedLinkedDocBlockMarkdownAdapterMatcher);
