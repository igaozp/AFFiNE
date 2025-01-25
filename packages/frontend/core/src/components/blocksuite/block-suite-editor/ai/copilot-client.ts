import { showAILoginRequiredAtom } from '@affine/core/components/affine/auth/ai-login-required';
import {
  cleanupCopilotSessionMutation,
  createCopilotMessageMutation,
  createCopilotSessionMutation,
  forkCopilotSessionMutation,
  getCopilotHistoriesQuery,
  getCopilotHistoryIdsQuery,
  getCopilotSessionsQuery,
  GraphQLError,
  type GraphQLQuery,
  type QueryOptions,
  type QueryResponse,
  type RequestOptions,
  updateCopilotSessionMutation,
  UserFriendlyError,
} from '@affine/graphql';
import {
  GeneralNetworkError,
  PaymentRequiredError,
  UnauthorizedError,
} from '@blocksuite/affine/blocks';
import { getCurrentStore } from '@toeverything/infra';

type OptionsField<T extends GraphQLQuery> =
  RequestOptions<T>['variables'] extends { options: infer U } ? U : never;

function codeToError(error: UserFriendlyError) {
  switch (error.status) {
    case 401:
      return new UnauthorizedError();
    case 402:
      return new PaymentRequiredError();
    default:
      return new GeneralNetworkError(
        error.code
          ? `${error.code}: ${error.message}\nIdentify: ${error.name}`
          : undefined
      );
  }
}

export function resolveError(err: any) {
  const standardError =
    err instanceof GraphQLError
      ? new UserFriendlyError(err.extensions)
      : UserFriendlyError.fromAnyError(err);

  return codeToError(standardError);
}

export function handleError(src: any) {
  const err = resolveError(src);
  if (err instanceof UnauthorizedError) {
    getCurrentStore().set(showAILoginRequiredAtom, true);
  }
  return err;
}

export class CopilotClient {
  constructor(
    readonly gql: <Query extends GraphQLQuery>(
      options: QueryOptions<Query>
    ) => Promise<QueryResponse<Query>>,
    readonly fetcher: (input: string, init?: RequestInit) => Promise<Response>,
    readonly eventSource: (
      url: string,
      eventSourceInitDict?: EventSourceInit
    ) => EventSource
  ) {}

  async createSession(
    options: OptionsField<typeof createCopilotSessionMutation>
  ) {
    const res = await this.gql({
      query: createCopilotSessionMutation,
      variables: {
        options,
      },
    });
    return res.createCopilotSession;
  }

  async updateSession(
    options: OptionsField<typeof updateCopilotSessionMutation>
  ) {
    const res = await this.gql({
      query: updateCopilotSessionMutation,
      variables: {
        options,
      },
    });
    return res.updateCopilotSession;
  }

  async forkSession(options: OptionsField<typeof forkCopilotSessionMutation>) {
    const res = await this.gql({
      query: forkCopilotSessionMutation,
      variables: {
        options,
      },
    });
    return res.forkCopilotSession;
  }

  async createMessage(
    options: OptionsField<typeof createCopilotMessageMutation>
  ) {
    const res = await this.gql({
      query: createCopilotMessageMutation,
      variables: {
        options,
      },
    });
    return res.createCopilotMessage;
  }

  async getSessions(workspaceId: string) {
    const res = await this.gql({
      query: getCopilotSessionsQuery,
      variables: {
        workspaceId,
      },
    });
    return res.currentUser?.copilot;
  }

  async getHistories(
    workspaceId: string,
    docId?: string,
    options?: RequestOptions<
      typeof getCopilotHistoriesQuery
    >['variables']['options']
  ) {
    const res = await this.gql({
      query: getCopilotHistoriesQuery,
      variables: {
        workspaceId,
        docId,
        options,
      },
    });

    return res.currentUser?.copilot?.histories;
  }

  async getHistoryIds(
    workspaceId: string,
    docId?: string,
    options?: RequestOptions<
      typeof getCopilotHistoriesQuery
    >['variables']['options']
  ) {
    const res = await this.gql({
      query: getCopilotHistoryIdsQuery,
      variables: {
        workspaceId,
        docId,
        options,
      },
    });

    return res.currentUser?.copilot?.histories;
  }

  async cleanupSessions(input: {
    workspaceId: string;
    docId: string;
    sessionIds: string[];
  }) {
    const res = await this.gql({
      query: cleanupCopilotSessionMutation,
      variables: {
        input,
      },
    });
    return res.cleanupCopilotSession;
  }

  async chatText({
    sessionId,
    messageId,
    signal,
  }: {
    sessionId: string;
    messageId?: string;
    signal?: AbortSignal;
  }) {
    let url = `/api/copilot/chat/${sessionId}`;
    if (messageId) {
      url += `?messageId=${encodeURIComponent(messageId)}`;
    }
    const response = await this.fetcher(url.toString(), { signal });
    return response.text();
  }

  // Text or image to text
  chatTextStream(
    {
      sessionId,
      messageId,
    }: {
      sessionId: string;
      messageId?: string;
    },
    endpoint = 'stream'
  ) {
    let url = `/api/copilot/chat/${sessionId}/${endpoint}`;
    if (messageId) {
      url += `?messageId=${encodeURIComponent(messageId)}`;
    }
    return this.eventSource(url);
  }

  // Text or image to images
  imagesStream(
    sessionId: string,
    messageId?: string,
    seed?: string,
    endpoint = 'images'
  ) {
    let url = `/api/copilot/chat/${sessionId}/${endpoint}`;

    if (messageId || seed) {
      url += '?';
      url += new URLSearchParams(
        Object.fromEntries(
          Object.entries({ messageId, seed }).filter(
            ([_, v]) => v !== undefined
          )
        ) as Record<string, string>
      ).toString();
    }
    return this.eventSource(url);
  }
}
