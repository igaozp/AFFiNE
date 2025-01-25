import { GraphQLError as BaseGraphQLError } from 'graphql';

import { type ErrorDataUnion, ErrorNames } from './schema';

export interface UserFriendlyErrorResponse {
  status: number;
  code: string;
  type: string;
  name: ErrorNames;
  message: string;
  args?: any;
  stacktrace?: string;
}

export class UserFriendlyError
  extends Error
  implements UserFriendlyErrorResponse
{
  readonly status = this.response.status;
  readonly code = this.response.code;
  readonly type = this.response.type;
  override readonly name = this.response.name;
  override readonly message = this.response.message;
  readonly args = this.response.args;
  readonly stacktrace = this.response.stacktrace;

  static fromAnyError(response: any) {
    if (response instanceof GraphQLError) {
      return new UserFriendlyError(response.extensions);
    }

    if (
      'originError' in response &&
      response.originError instanceof UserFriendlyError
    ) {
      return response.originError as UserFriendlyError;
    }

    if (
      response &&
      typeof response === 'object' &&
      response.type &&
      response.name
    ) {
      return new UserFriendlyError(response);
    }

    return new UserFriendlyError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      type: 'INTERNAL_SERVER_ERROR',
      name: ErrorNames.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }

  constructor(private readonly response: UserFriendlyErrorResponse) {
    super(response.message);
  }
}

export class GraphQLError extends BaseGraphQLError {
  // @ts-expect-error better to be a known type without any type casting
  override extensions!: UserFriendlyErrorResponse;
}

type ToPascalCase<S extends string> = S extends `${infer A}_${infer B}`
  ? `${Capitalize<Lowercase<A>>}${ToPascalCase<B>}`
  : Capitalize<Lowercase<S>>;

export type ErrorData = {
  [K in ErrorNames]: Extract<
    ErrorDataUnion,
    { __typename?: `${ToPascalCase<K>}DataType` }
  >;
};
