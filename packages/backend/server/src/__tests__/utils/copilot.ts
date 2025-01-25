import { randomBytes } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import {
  DEFAULT_DIMENSIONS,
  OpenAIProvider,
} from '../../plugins/copilot/providers/openai';
import {
  CopilotCapability,
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotImageToImageProvider,
  CopilotImageToTextProvider,
  CopilotProviderType,
  CopilotTextToEmbeddingProvider,
  CopilotTextToImageProvider,
  CopilotTextToTextProvider,
  PromptConfig,
  PromptMessage,
} from '../../plugins/copilot/types';
import { NodeExecutorType } from '../../plugins/copilot/workflow/executor';
import {
  WorkflowGraph,
  WorkflowNodeType,
  WorkflowParams,
} from '../../plugins/copilot/workflow/types';
import { gql } from './common';
import { handleGraphQLError, sleep } from './utils';

// @ts-expect-error no error
export class MockCopilotTestProvider
  extends OpenAIProvider
  implements
    CopilotTextToTextProvider,
    CopilotTextToEmbeddingProvider,
    CopilotTextToImageProvider,
    CopilotImageToImageProvider,
    CopilotImageToTextProvider
{
  static override readonly type = CopilotProviderType.Test;
  override readonly availableModels = [
    'test',
    'gpt-4o',
    'gpt-4o-2024-08-06',
    'fast-sdxl/image-to-image',
    'lcm-sd15-i2i',
    'clarity-upscaler',
    'imageutils/rembg',
  ];
  static override readonly capabilities = [
    CopilotCapability.TextToText,
    CopilotCapability.TextToEmbedding,
    CopilotCapability.TextToImage,
    CopilotCapability.ImageToImage,
    CopilotCapability.ImageToText,
  ];

  constructor() {
    super({ apiKey: '1' });
  }

  override getCapabilities(): CopilotCapability[] {
    return MockCopilotTestProvider.capabilities;
  }

  static override assetsConfig(_config: any) {
    return true;
  }

  override get type(): CopilotProviderType {
    return CopilotProviderType.Test;
  }

  override async isModelAvailable(model: string): Promise<boolean> {
    return this.availableModels.includes(model);
  }

  // ====== text to text ======

  override async generateText(
    messages: PromptMessage[],
    model: string = 'test',
    options: CopilotChatOptions = {}
  ): Promise<string> {
    this.checkParams({ messages, model, options });
    // make some time gap for history test case
    await sleep(100);
    return 'generate text to text';
  }

  override async *generateTextStream(
    messages: PromptMessage[],
    model: string = 'gpt-4o-mini',
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    this.checkParams({ messages, model, options });

    // make some time gap for history test case
    await sleep(100);
    const result = 'generate text to text stream';
    for (const message of result) {
      yield message;
      if (options.signal?.aborted) {
        break;
      }
    }
  }

  // ====== text to embedding ======

  override async generateEmbedding(
    messages: string | string[],
    model: string,
    options: CopilotEmbeddingOptions = { dimensions: DEFAULT_DIMENSIONS }
  ): Promise<number[][]> {
    messages = Array.isArray(messages) ? messages : [messages];
    this.checkParams({ embeddings: messages, model, options });

    // make some time gap for history test case
    await sleep(100);
    return [Array.from(randomBytes(options.dimensions)).map(v => v % 128)];
  }

  // ====== text to image ======
  override async generateImages(
    messages: PromptMessage[],
    model: string = 'test',
    _options: {
      signal?: AbortSignal;
      user?: string;
    } = {}
  ): Promise<Array<string>> {
    const { content: prompt } = messages[0] || {};
    if (!prompt) {
      throw new Error('Prompt is required');
    }

    // make some time gap for history test case
    await sleep(100);
    // just let test case can easily verify the final prompt
    return [`https://example.com/${model}.jpg`, prompt];
  }

  override async *generateImagesStream(
    messages: PromptMessage[],
    model: string = 'dall-e-3',
    options: {
      signal?: AbortSignal;
      user?: string;
    } = {}
  ): AsyncIterable<string> {
    const ret = await this.generateImages(messages, model, options);
    for (const url of ret) {
      yield url;
    }
  }
}

export async function createCopilotSession(
  app: INestApplication,
  userToken: string,
  workspaceId: string,
  docId: string,
  promptName: string
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(userToken, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
        mutation createCopilotSession($options: CreateChatSessionInput!) {
          createCopilotSession(options: $options)
        }
      `,
      variables: { options: { workspaceId, docId, promptName } },
    })
    .expect(200);

  handleGraphQLError(res);

  return res.body.data.createCopilotSession;
}

export async function updateCopilotSession(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  promptName: string
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(userToken, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
        mutation updateCopilotSession($options: UpdateChatSessionInput!) {
          updateCopilotSession(options: $options)
        }
      `,
      variables: { options: { sessionId, promptName } },
    })
    .expect(200);

  handleGraphQLError(res);

  return res.body.data.updateCopilotSession;
}

export async function forkCopilotSession(
  app: INestApplication,
  userToken: string,
  workspaceId: string,
  docId: string,
  sessionId: string,
  latestMessageId: string
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(userToken, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
        mutation forkCopilotSession($options: ForkChatSessionInput!) {
          forkCopilotSession(options: $options)
        }
      `,
      variables: {
        options: { workspaceId, docId, sessionId, latestMessageId },
      },
    })
    .expect(200);

  handleGraphQLError(res);

  return res.body.data.forkCopilotSession;
}

export async function createCopilotMessage(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  content?: string,
  attachments?: string[],
  blobs?: ArrayBuffer[],
  params?: Record<string, string>
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(userToken, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
        mutation createCopilotMessage($options: CreateChatMessageInput!) {
          createCopilotMessage(options: $options)
        }
      `,
      variables: {
        options: { sessionId, content, attachments, blobs, params },
      },
    })
    .expect(200);

  handleGraphQLError(res);

  return res.body.data.createCopilotMessage;
}

export async function chatWithText(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  messageId?: string,
  prefix = ''
): Promise<string> {
  const query = messageId ? `?messageId=${messageId}` : '';
  const res = await request(app.getHttpServer())
    .get(`/api/copilot/chat/${sessionId}${prefix}${query}`)
    .auth(userToken, { type: 'bearer' })
    .expect(200);

  return res.text;
}

export async function chatWithTextStream(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  messageId?: string
) {
  return chatWithText(app, userToken, sessionId, messageId, '/stream');
}

export async function chatWithWorkflow(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  messageId?: string
) {
  return chatWithText(app, userToken, sessionId, messageId, '/workflow');
}

export async function chatWithImages(
  app: INestApplication,
  userToken: string,
  sessionId: string,
  messageId?: string
) {
  return chatWithText(app, userToken, sessionId, messageId, '/images');
}

export async function unsplashSearch(
  app: INestApplication,
  userToken: string,
  params: Record<string, string> = {}
) {
  const query = new URLSearchParams(params);
  const res = await request(app.getHttpServer())
    .get(`/api/copilot/unsplash/photos?${query}`)
    .auth(userToken, { type: 'bearer' });
  return res;
}

export function sse2array(eventSource: string) {
  const blocks = eventSource.replace(/^\n(.*?)\n$/, '$1').split(/\n\n+/);
  return blocks.map(block =>
    block.split('\n').reduce(
      (prev, curr) => {
        const [key, ...values] = curr.split(': ');
        return Object.assign(prev, { [key]: values.join(': ') });
      },
      {} as Record<string, string>
    )
  );
}

export function array2sse(blocks: Record<string, string>[]) {
  return blocks
    .map(
      e =>
        '\n' +
        Object.entries(e)
          .filter(([k]) => !!k)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
    )
    .join('\n');
}

export function textToEventStream(
  content: string | string[],
  id: string,
  event = 'message'
): string {
  return (
    Array.from(content)
      .map(x => `\nevent: ${event}\nid: ${id}\ndata: ${x}`)
      .join('\n') + '\n\n'
  );
}

type ChatMessage = {
  id?: string;
  role: string;
  content: string;
  attachments: string[] | null;
  createdAt: string;
};

type History = {
  sessionId: string;
  tokens: number;
  action: string | null;
  createdAt: string;
  messages: ChatMessage[];
};

export async function getHistories(
  app: INestApplication,
  userToken: string,
  variables: {
    workspaceId: string;
    docId?: string;
    options?: {
      action?: boolean;
      fork?: boolean;
      limit?: number;
      skip?: number;
      sessionOrder?: 'asc' | 'desc';
      messageOrder?: 'asc' | 'desc';
      sessionId?: string;
    };
  }
): Promise<History[]> {
  const res = await request(app.getHttpServer())
    .post(gql)
    .auth(userToken, { type: 'bearer' })
    .set({ 'x-request-id': 'test', 'x-operation-name': 'test' })
    .send({
      query: `
      query getCopilotHistories(
        $workspaceId: String!
        $docId: String
        $options: QueryChatHistoriesInput
      ) {
        currentUser {
          copilot(workspaceId: $workspaceId) {
            histories(docId: $docId, options: $options) {
              sessionId
              tokens
              action
              createdAt
              messages {
                id
                role
                content
                attachments
                createdAt
              }
            }
          }
        }
      }
    `,
      variables,
    })
    .expect(200);

  handleGraphQLError(res);

  return res.body.data.currentUser?.copilot?.histories || [];
}

type Prompt = {
  name: string;
  model: string;
  messages: PromptMessage[];
  config?: PromptConfig;
};
type WorkflowTestCase = {
  graph: WorkflowGraph;
  prompts: Prompt[];
  callCount: number[];
  input: string[];
  params: WorkflowParams[];
  result: (string | undefined)[];
};

export const WorkflowTestCases: WorkflowTestCase[] = [
  {
    prompts: [
      {
        name: 'test1',
        model: 'test',
        messages: [{ role: 'user', content: '{{content}}' }],
      },
    ],
    graph: {
      name: 'test chat text node',
      graph: [
        {
          id: 'start',
          name: 'test chat text node',
          nodeType: WorkflowNodeType.Basic,
          type: NodeExecutorType.ChatText,
          promptName: 'test1',
          edges: [],
        },
      ],
    },
    callCount: [1],
    input: ['test'],
    params: [],
    result: ['generate text to text stream'],
  },
  {
    prompts: [],
    graph: {
      name: 'test check json node',
      graph: [
        {
          id: 'start',
          name: 'basic node',
          nodeType: WorkflowNodeType.Basic,
          type: NodeExecutorType.CheckJson,
          edges: [],
        },
      ],
    },
    callCount: [1, 1],
    input: ['{"test": "true"}', '{"test": '],
    params: [],
    result: ['true', 'false'],
  },
  {
    prompts: [],
    graph: {
      name: 'test check html node',
      graph: [
        {
          id: 'start',
          name: 'basic node',
          nodeType: WorkflowNodeType.Basic,
          type: NodeExecutorType.CheckHtml,
          edges: [],
        },
      ],
    },
    callCount: [1, 1, 1, 1],
    params: [{}, { strict: 'true' }, {}, {}],
    input: [
      '<html><span /></html>',
      '<html><span /></html>',
      '<img src="http://123.com/1.jpg" />',
      '{"test": "true"}',
    ],
    result: ['true', 'false', 'true', 'false'],
  },
  {
    prompts: [],
    graph: {
      name: 'test nope node',
      graph: [
        {
          id: 'start',
          name: 'nope node',
          nodeType: WorkflowNodeType.Nope,
          edges: [],
        },
      ],
    },
    callCount: [1],
    input: ['test'],
    params: [],
    result: ['test'],
  },
];

export const TestAssets = {
  SSOT: `In [information science](https://en.wikipedia.org/wiki/Information_science) and [information technology](https://en.wikipedia.org/wiki/Information_technology), **single source of truth** (**SSOT**) architecture, or **single point of truth** (**SPOT**) architecture, for [information systems](https://en.wikipedia.org/wiki/Information_system) is the practice of structuring [information models](https://en.wikipedia.org/wiki/Information_model) and associated [data schemas](https://en.wikipedia.org/wiki/Database_schema) such that every [data element](https://en.wikipedia.org/wiki/Data_element) is [mastered](https://en.wikipedia.org/wiki/Golden_record_(informatics)) (or edited) in only one place, providing [data normalization to a canonical form](https://en.wikipedia.org/wiki/Canonical_form#Computing) (for example, in [database normalization](https://en.wikipedia.org/wiki/Database_normalization) or content [transclusion](https://en.wikipedia.org/wiki/Transclusion)).\n\nThere are several scenarios with respect to copies and updates:\n\n* The master data is never copied and instead only references to it are made; this means that all reads and updates go directly to the SSOT.\n* The master data is copied but the copies are only read and only the master data is updated; if requests to read data are only made on copies, this is an instance of [CQRS](https://en.wikipedia.org/wiki/CQRS).\n* The master data is copied and the copies are updated; this needs a reconciliation mechanism when there are concurrent updates.\n  * Updates on copies can be thrown out whenever a concurrent update is made on the master, so they are not considered fully committed until propagated to the master. (many blockchains work that way.)\n  * Concurrent updates are merged. (if an automatic merge fails, it could fall back on another strategy, which could be the previous strategy or something else like manual intervention, which most source version control systems do.)\n\nThe advantages of SSOT architectures include easier prevention of mistaken inconsistencies (such as a duplicate value/copy somewhere being forgotten), and greatly simplified [version control](https://en.wikipedia.org/wiki/Version_control). Without a SSOT, dealing with inconsistencies implies either complex and error-prone consensus algorithms, or using a simpler architecture that's liable to lose data in the face of inconsistency (the latter may seem unacceptable but it is sometimes a very good choice; it is how most blockchains operate: a transaction is actually final only if it was included in the next block that is mined).\n\nIdeally, SSOT systems provide data that are authentic (and [authenticatable](https://en.wikipedia.org/wiki/Authentication)), relevant, and [referable](https://en.wikipedia.org/wiki/Reference_(computer_science)).[[1]](https://en.wikipedia.org/wiki/Single_source_of_truth#cite_note-1)\n\nDeployment of an SSOT architecture is becoming increasingly important in enterprise settings where incorrectly linked duplicate or de-normalized data elements (a direct consequence of intentional or unintentional [denormalization](https://en.wikipedia.org/wiki/Denormalization) of any explicit data model) pose a risk for retrieval of outdated, and therefore incorrect, information. Common examples (i.e., example classes of implementation) are as follows:\n\n* In [electronic health records](https://en.wikipedia.org/wiki/Electronic_health_record) (EHRs), it is imperative to accurately validate patient identity against a single referential repository, which serves as the SSOT. Duplicate representations of data within the enterprise would be implemented by the use of [pointers](https://en.wikipedia.org/wiki/Pointer_(computer_programming)) rather than duplicate database tables, rows, or cells. This ensures that data updates to elements in the authoritative location are comprehensively distributed to all [federated database](https://en.wikipedia.org/wiki/Federated_database) constituencies in the larger overall [enterprise architecture](https://en.wikipedia.org/wiki/Enterprise_architecture). EHRs are an excellent class for exemplifying how SSOT architecture is both poignantly necessary and challenging to achieve: it is challenging because inter-organization [health information exchange](https://en.wikipedia.org/wiki/Health_information_exchange) is inherently a [cybersecurity](https://en.wikipedia.org/wiki/Computer_security) competence hurdle, and nonetheless it is necessary, to prevent [medical errors](https://en.wikipedia.org/wiki/Medical_error), to prevent the wasted costs of inefficiency (such as duplicated work or rework), and to make the [primary care](https://en.wikipedia.org/wiki/Primary_care) and [medical home](https://en.wikipedia.org/wiki/Medical_home) concepts feasible (to achieve competent [care transitions](https://en.wikipedia.org/wiki/Transitional_care)).\n* [Single-source publishing](https://en.wikipedia.org/wiki/Single-source_publishing) as a general principle or ideal in [content management](https://en.wikipedia.org/wiki/Content_management) relies on having SSOTs, via [transclusion](https://en.wikipedia.org/wiki/Transclusion) or (otherwise, at least) substitution. Substitution happens via [libraries of objects](https://en.wikipedia.org/wiki/Library_(computing)#Object_libraries) that can be propagated as static copies which are later refreshed when necessary (that is, when refreshing of the [copy-paste](https://en.wikipedia.org/wiki/Cut,_copy,_and_paste) or [import](https://en.wikipedia.org/wiki/Import_and_export_of_data) is triggered by a larger updating event). [Component content management systems](https://en.wikipedia.org/wiki/Component_content_management_system) are a class of [content management systems](https://en.wikipedia.org/wiki/Content_management_system) that aim to provide competence on this level.`,
  Code: `fn euclidean_distance(a: &Vec<f64>, b: &Vec<f64>) -> f64 {\na.iter().zip(b.iter()).map(|(x, y)| (*x - *y).powi(2)).sum::<f64>().sqrt()\n}`,
  TODO: 'The PDF exporting feature in edgeless is flawed, which is not supposed to support rendering content with infinite logical size. We should remove this feature entry to user, but the current "export blob in surface ref" feature should be migrated and kept (which is base on the edgelessToCanvas API, which makes sense for exporting a partial viewport area for the page)',
};
