/* do not manipulate this file manually. */
export interface GraphQLQuery {
  id: string;
  operationName: string;
  definitionName: string;
  query: string;
  containsFile?: boolean;
}

export const passwordLimitsFragment = `
fragment PasswordLimits on PasswordLimitsType {
  minLength
  maxLength
}`
export const credentialsRequirementsFragment = `
fragment CredentialsRequirements on CredentialsRequirementType {
  password {
    ...PasswordLimits
  }
}`
export const adminServerConfigQuery = {
  id: 'adminServerConfigQuery' as const,
  operationName: 'adminServerConfig',
  definitionName: 'serverConfig',
  containsFile: false,
  query: `
query adminServerConfig {
  serverConfig {
    version
    baseUrl
    name
    features
    type
    initialized
    credentialsRequirement {
      ...CredentialsRequirements
    }
    availableUserFeatures
  }
}${passwordLimitsFragment}
${credentialsRequirementsFragment}`,
};

export const deleteBlobMutation = {
  id: 'deleteBlobMutation' as const,
  operationName: 'deleteBlob',
  definitionName: 'deleteBlob',
  containsFile: false,
  query: `
mutation deleteBlob($workspaceId: String!, $key: String!, $permanently: Boolean) {
  deleteBlob(workspaceId: $workspaceId, key: $key, permanently: $permanently)
}`,
};

export const listBlobsQuery = {
  id: 'listBlobsQuery' as const,
  operationName: 'listBlobs',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query listBlobs($workspaceId: String!) {
  workspace(id: $workspaceId) {
    blobs {
      key
      size
      mime
      createdAt
    }
  }
}`,
};

export const releaseDeletedBlobsMutation = {
  id: 'releaseDeletedBlobsMutation' as const,
  operationName: 'releaseDeletedBlobs',
  definitionName: 'releaseDeletedBlobs',
  containsFile: false,
  query: `
mutation releaseDeletedBlobs($workspaceId: String!) {
  releaseDeletedBlobs(workspaceId: $workspaceId)
}`,
};

export const setBlobMutation = {
  id: 'setBlobMutation' as const,
  operationName: 'setBlob',
  definitionName: 'setBlob',
  containsFile: true,
  query: `
mutation setBlob($workspaceId: String!, $blob: Upload!) {
  setBlob(workspaceId: $workspaceId, blob: $blob)
}`,
};

export const cancelSubscriptionMutation = {
  id: 'cancelSubscriptionMutation' as const,
  operationName: 'cancelSubscription',
  definitionName: 'cancelSubscription',
  containsFile: false,
  query: `
mutation cancelSubscription($plan: SubscriptionPlan = Pro, $workspaceId: String) {
  cancelSubscription(plan: $plan, workspaceId: $workspaceId) {
    id
    status
    nextBillAt
    canceledAt
  }
}`,
};

export const changeEmailMutation = {
  id: 'changeEmailMutation' as const,
  operationName: 'changeEmail',
  definitionName: 'changeEmail',
  containsFile: false,
  query: `
mutation changeEmail($token: String!, $email: String!) {
  changeEmail(token: $token, email: $email) {
    id
    email
  }
}`,
};

export const createChangePasswordUrlMutation = {
  id: 'createChangePasswordUrlMutation' as const,
  operationName: 'createChangePasswordUrl',
  definitionName: 'createChangePasswordUrl',
  containsFile: false,
  query: `
mutation createChangePasswordUrl($callbackUrl: String!, $userId: String!) {
  createChangePasswordUrl(callbackUrl: $callbackUrl, userId: $userId)
}`,
};

export const changePasswordMutation = {
  id: 'changePasswordMutation' as const,
  operationName: 'changePassword',
  definitionName: 'changePassword',
  containsFile: false,
  query: `
mutation changePassword($token: String!, $userId: String!, $newPassword: String!) {
  changePassword(token: $token, userId: $userId, newPassword: $newPassword)
}`,
};

export const copilotQuotaQuery = {
  id: 'copilotQuotaQuery' as const,
  operationName: 'copilotQuota',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query copilotQuota {
  currentUser {
    copilot {
      quota {
        limit
        used
      }
    }
  }
}`,
};

export const cleanupCopilotSessionMutation = {
  id: 'cleanupCopilotSessionMutation' as const,
  operationName: 'cleanupCopilotSession',
  definitionName: 'cleanupCopilotSession',
  containsFile: false,
  query: `
mutation cleanupCopilotSession($input: DeleteSessionInput!) {
  cleanupCopilotSession(options: $input)
}`,
};

export const createCheckoutSessionMutation = {
  id: 'createCheckoutSessionMutation' as const,
  operationName: 'createCheckoutSession',
  definitionName: 'createCheckoutSession',
  containsFile: false,
  query: `
mutation createCheckoutSession($input: CreateCheckoutSessionInput!) {
  createCheckoutSession(input: $input)
}`,
};

export const createCopilotMessageMutation = {
  id: 'createCopilotMessageMutation' as const,
  operationName: 'createCopilotMessage',
  definitionName: 'createCopilotMessage',
  containsFile: true,
  query: `
mutation createCopilotMessage($options: CreateChatMessageInput!) {
  createCopilotMessage(options: $options)
}`,
};

export const createCopilotSessionMutation = {
  id: 'createCopilotSessionMutation' as const,
  operationName: 'createCopilotSession',
  definitionName: 'createCopilotSession',
  containsFile: false,
  query: `
mutation createCopilotSession($options: CreateChatSessionInput!) {
  createCopilotSession(options: $options)
}`,
};

export const updateCopilotSessionMutation = {
  id: 'updateCopilotSessionMutation' as const,
  operationName: 'updateCopilotSession',
  definitionName: 'updateCopilotSession',
  containsFile: false,
  query: `
mutation updateCopilotSession($options: UpdateChatSessionInput!) {
  updateCopilotSession(options: $options)
}`,
};

export const createCustomerPortalMutation = {
  id: 'createCustomerPortalMutation' as const,
  operationName: 'createCustomerPortal',
  definitionName: 'createCustomerPortal',
  containsFile: false,
  query: `
mutation createCustomerPortal {
  createCustomerPortal
}`,
};

export const createUserMutation = {
  id: 'createUserMutation' as const,
  operationName: 'createUser',
  definitionName: 'createUser',
  containsFile: false,
  query: `
mutation createUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
  }
}`,
};

export const createWorkspaceMutation = {
  id: 'createWorkspaceMutation' as const,
  operationName: 'createWorkspace',
  definitionName: 'createWorkspace',
  containsFile: false,
  query: `
mutation createWorkspace {
  createWorkspace {
    id
    public
    createdAt
  }
}`,
};

export const deleteAccountMutation = {
  id: 'deleteAccountMutation' as const,
  operationName: 'deleteAccount',
  definitionName: 'deleteAccount',
  containsFile: false,
  query: `
mutation deleteAccount {
  deleteAccount {
    success
  }
}`,
};

export const deleteUserMutation = {
  id: 'deleteUserMutation' as const,
  operationName: 'deleteUser',
  definitionName: 'deleteUser',
  containsFile: false,
  query: `
mutation deleteUser($id: String!) {
  deleteUser(id: $id) {
    success
  }
}`,
};

export const deleteWorkspaceMutation = {
  id: 'deleteWorkspaceMutation' as const,
  operationName: 'deleteWorkspace',
  definitionName: 'deleteWorkspace',
  containsFile: false,
  query: `
mutation deleteWorkspace($id: String!) {
  deleteWorkspace(id: $id)
}`,
};

export const forkCopilotSessionMutation = {
  id: 'forkCopilotSessionMutation' as const,
  operationName: 'forkCopilotSession',
  definitionName: 'forkCopilotSession',
  containsFile: false,
  query: `
mutation forkCopilotSession($options: ForkChatSessionInput!) {
  forkCopilotSession(options: $options)
}`,
};

export const getCopilotHistoriesQuery = {
  id: 'getCopilotHistoriesQuery' as const,
  operationName: 'getCopilotHistories',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getCopilotHistories($workspaceId: String!, $docId: String, $options: QueryChatHistoriesInput) {
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
}`,
};

export const getCopilotHistoryIdsQuery = {
  id: 'getCopilotHistoryIdsQuery' as const,
  operationName: 'getCopilotHistoryIds',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getCopilotHistoryIds($workspaceId: String!, $docId: String, $options: QueryChatHistoriesInput) {
  currentUser {
    copilot(workspaceId: $workspaceId) {
      histories(docId: $docId, options: $options) {
        sessionId
        messages {
          id
          role
          createdAt
        }
      }
    }
  }
}`,
};

export const getCopilotSessionsQuery = {
  id: 'getCopilotSessionsQuery' as const,
  operationName: 'getCopilotSessions',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getCopilotSessions($workspaceId: String!) {
  currentUser {
    copilot(workspaceId: $workspaceId) {
      actions
      chats
    }
  }
}`,
};

export const getCurrentUserFeaturesQuery = {
  id: 'getCurrentUserFeaturesQuery' as const,
  operationName: 'getCurrentUserFeatures',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getCurrentUserFeatures {
  currentUser {
    id
    name
    email
    emailVerified
    avatarUrl
    features
  }
}`,
};

export const getCurrentUserQuery = {
  id: 'getCurrentUserQuery' as const,
  operationName: 'getCurrentUser',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getCurrentUser {
  currentUser {
    id
    name
    email
    emailVerified
    avatarUrl
    token {
      sessionToken
    }
  }
}`,
};

export const getInviteInfoQuery = {
  id: 'getInviteInfoQuery' as const,
  operationName: 'getInviteInfo',
  definitionName: 'getInviteInfo',
  containsFile: false,
  query: `
query getInviteInfo($inviteId: String!) {
  getInviteInfo(inviteId: $inviteId) {
    workspace {
      id
      name
      avatar
    }
    user {
      id
      name
      avatarUrl
    }
  }
}`,
};

export const getIsAdminQuery = {
  id: 'getIsAdminQuery' as const,
  operationName: 'getIsAdmin',
  definitionName: 'isAdmin',
  containsFile: false,
  query: `
query getIsAdmin($workspaceId: String!) {
  isAdmin(workspaceId: $workspaceId)
}`,
};

export const getIsOwnerQuery = {
  id: 'getIsOwnerQuery' as const,
  operationName: 'getIsOwner',
  definitionName: 'isOwner',
  containsFile: false,
  query: `
query getIsOwner($workspaceId: String!) {
  isOwner(workspaceId: $workspaceId)
}`,
};

export const getMemberCountByWorkspaceIdQuery = {
  id: 'getMemberCountByWorkspaceIdQuery' as const,
  operationName: 'getMemberCountByWorkspaceId',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getMemberCountByWorkspaceId($workspaceId: String!) {
  workspace(id: $workspaceId) {
    memberCount
  }
}`,
};

export const getMembersByWorkspaceIdQuery = {
  id: 'getMembersByWorkspaceIdQuery' as const,
  operationName: 'getMembersByWorkspaceId',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getMembersByWorkspaceId($workspaceId: String!, $skip: Int!, $take: Int!) {
  workspace(id: $workspaceId) {
    memberCount
    members(skip: $skip, take: $take) {
      id
      name
      email
      avatarUrl
      permission
      inviteId
      emailVerified
      status
    }
  }
}`,
};

export const oauthProvidersQuery = {
  id: 'oauthProvidersQuery' as const,
  operationName: 'oauthProviders',
  definitionName: 'serverConfig',
  containsFile: false,
  query: `
query oauthProviders {
  serverConfig {
    oauthProviders
  }
}`,
};

export const getPromptsQuery = {
  id: 'getPromptsQuery' as const,
  operationName: 'getPrompts',
  definitionName: 'listCopilotPrompts',
  containsFile: false,
  query: `
query getPrompts {
  listCopilotPrompts {
    name
    model
    action
    config {
      jsonMode
      frequencyPenalty
      presencePenalty
      temperature
      topP
    }
    messages {
      role
      content
      params
    }
  }
}`,
};

export const getServerRuntimeConfigQuery = {
  id: 'getServerRuntimeConfigQuery' as const,
  operationName: 'getServerRuntimeConfig',
  definitionName: 'serverRuntimeConfig',
  containsFile: false,
  query: `
query getServerRuntimeConfig {
  serverRuntimeConfig {
    id
    module
    key
    description
    value
    type
    updatedAt
  }
}`,
};

export const getServerServiceConfigsQuery = {
  id: 'getServerServiceConfigsQuery' as const,
  operationName: 'getServerServiceConfigs',
  definitionName: 'serverServiceConfigs',
  containsFile: false,
  query: `
query getServerServiceConfigs {
  serverServiceConfigs {
    name
    config
  }
}`,
};

export const getUserByEmailQuery = {
  id: 'getUserByEmailQuery' as const,
  operationName: 'getUserByEmail',
  definitionName: 'userByEmail',
  containsFile: false,
  query: `
query getUserByEmail($email: String!) {
  userByEmail(email: $email) {
    id
    name
    email
    features
    hasPassword
    emailVerified
    avatarUrl
    quota {
      humanReadable {
        blobLimit
        historyPeriod
        memberLimit
        name
        storageQuota
      }
    }
  }
}`,
};

export const getUserFeaturesQuery = {
  id: 'getUserFeaturesQuery' as const,
  operationName: 'getUserFeatures',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getUserFeatures {
  currentUser {
    id
    features
  }
}`,
};

export const getUserQuery = {
  id: 'getUserQuery' as const,
  operationName: 'getUser',
  definitionName: 'user',
  containsFile: false,
  query: `
query getUser($email: String!) {
  user(email: $email) {
    __typename
    ... on UserType {
      id
      name
      avatarUrl
      email
      hasPassword
    }
    ... on LimitedUserType {
      email
      hasPassword
    }
  }
}`,
};

export const getUsersCountQuery = {
  id: 'getUsersCountQuery' as const,
  operationName: 'getUsersCount',
  definitionName: 'usersCount',
  containsFile: false,
  query: `
query getUsersCount {
  usersCount
}`,
};

export const getWorkspaceFeaturesQuery = {
  id: 'getWorkspaceFeaturesQuery' as const,
  operationName: 'getWorkspaceFeatures',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspaceFeatures($workspaceId: String!) {
  workspace(id: $workspaceId) {
    features
  }
}`,
};

export const getWorkspaceInfoQuery = {
  id: 'getWorkspaceInfoQuery' as const,
  operationName: 'getWorkspaceInfo',
  definitionName: 'isAdmin,isOwner,workspace',
  containsFile: false,
  query: `
query getWorkspaceInfo($workspaceId: String!) {
  isAdmin(workspaceId: $workspaceId)
  isOwner(workspaceId: $workspaceId)
  workspace(id: $workspaceId) {
    team
  }
}`,
};

export const getWorkspacePageMetaByIdQuery = {
  id: 'getWorkspacePageMetaByIdQuery' as const,
  operationName: 'getWorkspacePageMetaById',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspacePageMetaById($id: String!, $pageId: String!) {
  workspace(id: $id) {
    pageMeta(pageId: $pageId) {
      createdAt
      updatedAt
      createdBy {
        name
        avatarUrl
      }
      updatedBy {
        name
        avatarUrl
      }
    }
  }
}`,
};

export const getWorkspacePublicByIdQuery = {
  id: 'getWorkspacePublicByIdQuery' as const,
  operationName: 'getWorkspacePublicById',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspacePublicById($id: String!) {
  workspace(id: $id) {
    public
  }
}`,
};

export const getWorkspacePublicPageByIdQuery = {
  id: 'getWorkspacePublicPageByIdQuery' as const,
  operationName: 'getWorkspacePublicPageById',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspacePublicPageById($workspaceId: String!, $pageId: String!) {
  workspace(id: $workspaceId) {
    publicPage(pageId: $pageId) {
      id
      mode
    }
  }
}`,
};

export const getWorkspacePublicPagesQuery = {
  id: 'getWorkspacePublicPagesQuery' as const,
  operationName: 'getWorkspacePublicPages',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspacePublicPages($workspaceId: String!) {
  workspace(id: $workspaceId) {
    publicPages {
      id
      mode
    }
  }
}`,
};

export const getWorkspaceSubscriptionQuery = {
  id: 'getWorkspaceSubscriptionQuery' as const,
  operationName: 'getWorkspaceSubscription',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspaceSubscription($workspaceId: String!) {
  workspace(id: $workspaceId) {
    subscription {
      id
      status
      plan
      recurring
      start
      end
      nextBillAt
      canceledAt
      variant
    }
  }
}`,
};

export const getWorkspaceQuery = {
  id: 'getWorkspaceQuery' as const,
  operationName: 'getWorkspace',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspace($id: String!) {
  workspace(id: $id) {
    id
  }
}`,
};

export const getWorkspacesQuery = {
  id: 'getWorkspacesQuery' as const,
  operationName: 'getWorkspaces',
  definitionName: 'workspaces',
  containsFile: false,
  query: `
query getWorkspaces {
  workspaces {
    id
    initialized
    team
    owner {
      id
    }
  }
}`,
};

export const listHistoryQuery = {
  id: 'listHistoryQuery' as const,
  operationName: 'listHistory',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query listHistory($workspaceId: String!, $pageDocId: String!, $take: Int, $before: DateTime) {
  workspace(id: $workspaceId) {
    histories(guid: $pageDocId, take: $take, before: $before) {
      id
      timestamp
      editor {
        name
        avatarUrl
      }
    }
  }
}`,
};

export const getInvoicesCountQuery = {
  id: 'getInvoicesCountQuery' as const,
  operationName: 'getInvoicesCount',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query getInvoicesCount {
  currentUser {
    invoiceCount
  }
}`,
};

export const invoicesQuery = {
  id: 'invoicesQuery' as const,
  operationName: 'invoices',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query invoices($take: Int!, $skip: Int!) {
  currentUser {
    invoiceCount
    invoices(take: $take, skip: $skip) {
      id
      status
      currency
      amount
      reason
      lastPaymentError
      link
      createdAt
    }
  }
}`,
};

export const leaveWorkspaceMutation = {
  id: 'leaveWorkspaceMutation' as const,
  operationName: 'leaveWorkspace',
  definitionName: 'leaveWorkspace',
  containsFile: false,
  query: `
mutation leaveWorkspace($workspaceId: String!, $sendLeaveMail: Boolean) {
  leaveWorkspace(workspaceId: $workspaceId, sendLeaveMail: $sendLeaveMail)
}`,
};

export const listUsersQuery = {
  id: 'listUsersQuery' as const,
  operationName: 'listUsers',
  definitionName: 'users',
  containsFile: false,
  query: `
query listUsers($filter: ListUserInput!) {
  users(filter: $filter) {
    id
    name
    email
    features
    hasPassword
    emailVerified
    avatarUrl
  }
}`,
};

export const pricesQuery = {
  id: 'pricesQuery' as const,
  operationName: 'prices',
  definitionName: 'prices',
  containsFile: false,
  query: `
query prices {
  prices {
    type
    plan
    currency
    amount
    yearlyAmount
    lifetimeAmount
  }
}`,
};

export const publishPageMutation = {
  id: 'publishPageMutation' as const,
  operationName: 'publishPage',
  definitionName: 'publishPage',
  containsFile: false,
  query: `
mutation publishPage($workspaceId: String!, $pageId: String!, $mode: PublicPageMode = Page) {
  publishPage(workspaceId: $workspaceId, pageId: $pageId, mode: $mode) {
    id
    mode
  }
}`,
};

export const quotaQuery = {
  id: 'quotaQuery' as const,
  operationName: 'quota',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query quota {
  currentUser {
    id
    quota {
      name
      blobLimit
      storageQuota
      historyPeriod
      memberLimit
      humanReadable {
        name
        blobLimit
        storageQuota
        historyPeriod
        memberLimit
      }
    }
    quotaUsage {
      storageQuota
    }
  }
}`,
};

export const recoverDocMutation = {
  id: 'recoverDocMutation' as const,
  operationName: 'recoverDoc',
  definitionName: 'recoverDoc',
  containsFile: false,
  query: `
mutation recoverDoc($workspaceId: String!, $docId: String!, $timestamp: DateTime!) {
  recoverDoc(workspaceId: $workspaceId, guid: $docId, timestamp: $timestamp)
}`,
};

export const removeAvatarMutation = {
  id: 'removeAvatarMutation' as const,
  operationName: 'removeAvatar',
  definitionName: 'removeAvatar',
  containsFile: false,
  query: `
mutation removeAvatar {
  removeAvatar {
    success
  }
}`,
};

export const resumeSubscriptionMutation = {
  id: 'resumeSubscriptionMutation' as const,
  operationName: 'resumeSubscription',
  definitionName: 'resumeSubscription',
  containsFile: false,
  query: `
mutation resumeSubscription($plan: SubscriptionPlan = Pro, $workspaceId: String) {
  resumeSubscription(plan: $plan, workspaceId: $workspaceId) {
    id
    status
    nextBillAt
    start
    end
  }
}`,
};

export const revokeMemberPermissionMutation = {
  id: 'revokeMemberPermissionMutation' as const,
  operationName: 'revokeMemberPermission',
  definitionName: 'revoke',
  containsFile: false,
  query: `
mutation revokeMemberPermission($workspaceId: String!, $userId: String!) {
  revoke(workspaceId: $workspaceId, userId: $userId)
}`,
};

export const revokePublicPageMutation = {
  id: 'revokePublicPageMutation' as const,
  operationName: 'revokePublicPage',
  definitionName: 'revokePublicPage',
  containsFile: false,
  query: `
mutation revokePublicPage($workspaceId: String!, $pageId: String!) {
  revokePublicPage(workspaceId: $workspaceId, pageId: $pageId) {
    id
    mode
    public
  }
}`,
};

export const sendChangeEmailMutation = {
  id: 'sendChangeEmailMutation' as const,
  operationName: 'sendChangeEmail',
  definitionName: 'sendChangeEmail',
  containsFile: false,
  query: `
mutation sendChangeEmail($callbackUrl: String!) {
  sendChangeEmail(callbackUrl: $callbackUrl)
}`,
};

export const sendChangePasswordEmailMutation = {
  id: 'sendChangePasswordEmailMutation' as const,
  operationName: 'sendChangePasswordEmail',
  definitionName: 'sendChangePasswordEmail',
  containsFile: false,
  query: `
mutation sendChangePasswordEmail($callbackUrl: String!) {
  sendChangePasswordEmail(callbackUrl: $callbackUrl)
}`,
};

export const sendSetPasswordEmailMutation = {
  id: 'sendSetPasswordEmailMutation' as const,
  operationName: 'sendSetPasswordEmail',
  definitionName: 'sendSetPasswordEmail',
  containsFile: false,
  query: `
mutation sendSetPasswordEmail($callbackUrl: String!) {
  sendSetPasswordEmail(callbackUrl: $callbackUrl)
}`,
};

export const sendVerifyChangeEmailMutation = {
  id: 'sendVerifyChangeEmailMutation' as const,
  operationName: 'sendVerifyChangeEmail',
  definitionName: 'sendVerifyChangeEmail',
  containsFile: false,
  query: `
mutation sendVerifyChangeEmail($token: String!, $email: String!, $callbackUrl: String!) {
  sendVerifyChangeEmail(token: $token, email: $email, callbackUrl: $callbackUrl)
}`,
};

export const sendVerifyEmailMutation = {
  id: 'sendVerifyEmailMutation' as const,
  operationName: 'sendVerifyEmail',
  definitionName: 'sendVerifyEmail',
  containsFile: false,
  query: `
mutation sendVerifyEmail($callbackUrl: String!) {
  sendVerifyEmail(callbackUrl: $callbackUrl)
}`,
};

export const serverConfigQuery = {
  id: 'serverConfigQuery' as const,
  operationName: 'serverConfig',
  definitionName: 'serverConfig',
  containsFile: false,
  query: `
query serverConfig {
  serverConfig {
    version
    baseUrl
    name
    features
    type
    initialized
    credentialsRequirement {
      ...CredentialsRequirements
    }
  }
}${passwordLimitsFragment}
${credentialsRequirementsFragment}`,
};

export const setWorkspacePublicByIdMutation = {
  id: 'setWorkspacePublicByIdMutation' as const,
  operationName: 'setWorkspacePublicById',
  definitionName: 'updateWorkspace',
  containsFile: false,
  query: `
mutation setWorkspacePublicById($id: ID!, $public: Boolean!) {
  updateWorkspace(input: {id: $id, public: $public}) {
    id
  }
}`,
};

export const subscriptionQuery = {
  id: 'subscriptionQuery' as const,
  operationName: 'subscription',
  definitionName: 'currentUser',
  containsFile: false,
  query: `
query subscription {
  currentUser {
    id
    subscriptions {
      id
      status
      plan
      recurring
      start
      end
      nextBillAt
      canceledAt
      variant
    }
  }
}`,
};

export const updateAccountFeaturesMutation = {
  id: 'updateAccountFeaturesMutation' as const,
  operationName: 'updateAccountFeatures',
  definitionName: 'updateUserFeatures',
  containsFile: false,
  query: `
mutation updateAccountFeatures($userId: String!, $features: [FeatureType!]!) {
  updateUserFeatures(id: $userId, features: $features)
}`,
};

export const updateAccountMutation = {
  id: 'updateAccountMutation' as const,
  operationName: 'updateAccount',
  definitionName: 'updateUser',
  containsFile: false,
  query: `
mutation updateAccount($id: String!, $input: ManageUserInput!) {
  updateUser(id: $id, input: $input) {
    id
    name
    email
  }
}`,
};

export const updatePromptMutation = {
  id: 'updatePromptMutation' as const,
  operationName: 'updatePrompt',
  definitionName: 'updateCopilotPrompt',
  containsFile: false,
  query: `
mutation updatePrompt($name: String!, $messages: [CopilotPromptMessageInput!]!) {
  updateCopilotPrompt(name: $name, messages: $messages) {
    name
    model
    action
    config {
      jsonMode
      frequencyPenalty
      presencePenalty
      temperature
      topP
    }
    messages {
      role
      content
      params
    }
  }
}`,
};

export const updateServerRuntimeConfigsMutation = {
  id: 'updateServerRuntimeConfigsMutation' as const,
  operationName: 'updateServerRuntimeConfigs',
  definitionName: 'updateRuntimeConfigs',
  containsFile: false,
  query: `
mutation updateServerRuntimeConfigs($updates: JSONObject!) {
  updateRuntimeConfigs(updates: $updates) {
    key
    value
  }
}`,
};

export const updateSubscriptionMutation = {
  id: 'updateSubscriptionMutation' as const,
  operationName: 'updateSubscription',
  definitionName: 'updateSubscriptionRecurring',
  containsFile: false,
  query: `
mutation updateSubscription($plan: SubscriptionPlan = Pro, $recurring: SubscriptionRecurring!, $workspaceId: String) {
  updateSubscriptionRecurring(
    plan: $plan
    recurring: $recurring
    workspaceId: $workspaceId
  ) {
    id
    plan
    recurring
    nextBillAt
  }
}`,
};

export const updateUserProfileMutation = {
  id: 'updateUserProfileMutation' as const,
  operationName: 'updateUserProfile',
  definitionName: 'updateProfile',
  containsFile: false,
  query: `
mutation updateUserProfile($input: UpdateUserInput!) {
  updateProfile(input: $input) {
    id
    name
  }
}`,
};

export const uploadAvatarMutation = {
  id: 'uploadAvatarMutation' as const,
  operationName: 'uploadAvatar',
  definitionName: 'uploadAvatar',
  containsFile: true,
  query: `
mutation uploadAvatar($avatar: Upload!) {
  uploadAvatar(avatar: $avatar) {
    id
    name
    avatarUrl
    email
  }
}`,
};

export const verifyEmailMutation = {
  id: 'verifyEmailMutation' as const,
  operationName: 'verifyEmail',
  definitionName: 'verifyEmail',
  containsFile: false,
  query: `
mutation verifyEmail($token: String!) {
  verifyEmail(token: $token)
}`,
};

export const getWorkspaceConfigQuery = {
  id: 'getWorkspaceConfigQuery' as const,
  operationName: 'getWorkspaceConfig',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query getWorkspaceConfig($id: String!) {
  workspace(id: $id) {
    enableAi
    enableUrlPreview
    inviteLink {
      link
      expireTime
    }
  }
}`,
};

export const setEnableAiMutation = {
  id: 'setEnableAiMutation' as const,
  operationName: 'setEnableAi',
  definitionName: 'updateWorkspace',
  containsFile: false,
  query: `
mutation setEnableAi($id: ID!, $enableAi: Boolean!) {
  updateWorkspace(input: {id: $id, enableAi: $enableAi}) {
    id
  }
}`,
};

export const setEnableUrlPreviewMutation = {
  id: 'setEnableUrlPreviewMutation' as const,
  operationName: 'setEnableUrlPreview',
  definitionName: 'updateWorkspace',
  containsFile: false,
  query: `
mutation setEnableUrlPreview($id: ID!, $enableUrlPreview: Boolean!) {
  updateWorkspace(input: {id: $id, enableUrlPreview: $enableUrlPreview}) {
    id
  }
}`,
};

export const enabledFeaturesQuery = {
  id: 'enabledFeaturesQuery' as const,
  operationName: 'enabledFeatures',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query enabledFeatures($id: String!) {
  workspace(id: $id) {
    features
  }
}`,
};

export const availableFeaturesQuery = {
  id: 'availableFeaturesQuery' as const,
  operationName: 'availableFeatures',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query availableFeatures($id: String!) {
  workspace(id: $id) {
    availableFeatures
  }
}`,
};

export const setWorkspaceExperimentalFeatureMutation = {
  id: 'setWorkspaceExperimentalFeatureMutation' as const,
  operationName: 'setWorkspaceExperimentalFeature',
  definitionName: 'setWorkspaceExperimentalFeature',
  containsFile: false,
  query: `
mutation setWorkspaceExperimentalFeature($workspaceId: String!, $feature: FeatureType!, $enable: Boolean!) {
  setWorkspaceExperimentalFeature(
    workspaceId: $workspaceId
    feature: $feature
    enable: $enable
  )
}`,
};

export const addWorkspaceFeatureMutation = {
  id: 'addWorkspaceFeatureMutation' as const,
  operationName: 'addWorkspaceFeature',
  definitionName: 'addWorkspaceFeature',
  containsFile: false,
  query: `
mutation addWorkspaceFeature($workspaceId: String!, $feature: FeatureType!) {
  addWorkspaceFeature(workspaceId: $workspaceId, feature: $feature)
}`,
};

export const listWorkspaceFeaturesQuery = {
  id: 'listWorkspaceFeaturesQuery' as const,
  operationName: 'listWorkspaceFeatures',
  definitionName: 'listWorkspaceFeatures',
  containsFile: false,
  query: `
query listWorkspaceFeatures($feature: FeatureType!) {
  listWorkspaceFeatures(feature: $feature) {
    id
    public
    createdAt
    memberCount
    owner {
      id
    }
    features
  }
}`,
};

export const removeWorkspaceFeatureMutation = {
  id: 'removeWorkspaceFeatureMutation' as const,
  operationName: 'removeWorkspaceFeature',
  definitionName: 'removeWorkspaceFeature',
  containsFile: false,
  query: `
mutation removeWorkspaceFeature($workspaceId: String!, $feature: FeatureType!) {
  removeWorkspaceFeature(workspaceId: $workspaceId, feature: $feature)
}`,
};

export const inviteByEmailMutation = {
  id: 'inviteByEmailMutation' as const,
  operationName: 'inviteByEmail',
  definitionName: 'invite',
  containsFile: false,
  query: `
mutation inviteByEmail($workspaceId: String!, $email: String!, $sendInviteMail: Boolean) {
  invite(
    workspaceId: $workspaceId
    email: $email
    sendInviteMail: $sendInviteMail
  )
}`,
};

export const inviteByEmailsMutation = {
  id: 'inviteByEmailsMutation' as const,
  operationName: 'inviteByEmails',
  definitionName: 'inviteBatch',
  containsFile: false,
  query: `
mutation inviteByEmails($workspaceId: String!, $emails: [String!]!, $sendInviteMail: Boolean) {
  inviteBatch(
    workspaceId: $workspaceId
    emails: $emails
    sendInviteMail: $sendInviteMail
  ) {
    email
    inviteId
    sentSuccess
  }
}`,
};

export const acceptInviteByInviteIdMutation = {
  id: 'acceptInviteByInviteIdMutation' as const,
  operationName: 'acceptInviteByInviteId',
  definitionName: 'acceptInviteById',
  containsFile: false,
  query: `
mutation acceptInviteByInviteId($workspaceId: String!, $inviteId: String!, $sendAcceptMail: Boolean) {
  acceptInviteById(
    workspaceId: $workspaceId
    inviteId: $inviteId
    sendAcceptMail: $sendAcceptMail
  )
}`,
};

export const inviteBatchMutation = {
  id: 'inviteBatchMutation' as const,
  operationName: 'inviteBatch',
  definitionName: 'inviteBatch',
  containsFile: false,
  query: `
mutation inviteBatch($workspaceId: String!, $emails: [String!]!, $sendInviteMail: Boolean) {
  inviteBatch(
    workspaceId: $workspaceId
    emails: $emails
    sendInviteMail: $sendInviteMail
  ) {
    email
    inviteId
    sentSuccess
  }
}`,
};

export const createInviteLinkMutation = {
  id: 'createInviteLinkMutation' as const,
  operationName: 'createInviteLink',
  definitionName: 'createInviteLink',
  containsFile: false,
  query: `
mutation createInviteLink($workspaceId: String!, $expireTime: WorkspaceInviteLinkExpireTime!) {
  createInviteLink(workspaceId: $workspaceId, expireTime: $expireTime) {
    link
    expireTime
  }
}`,
};

export const revokeInviteLinkMutation = {
  id: 'revokeInviteLinkMutation' as const,
  operationName: 'revokeInviteLink',
  definitionName: 'revokeInviteLink',
  containsFile: false,
  query: `
mutation revokeInviteLink($workspaceId: String!) {
  revokeInviteLink(workspaceId: $workspaceId)
}`,
};

export const workspaceInvoicesQuery = {
  id: 'workspaceInvoicesQuery' as const,
  operationName: 'workspaceInvoices',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query workspaceInvoices($take: Int!, $skip: Int!, $workspaceId: String!) {
  workspace(id: $workspaceId) {
    invoiceCount
    invoices(take: $take, skip: $skip) {
      id
      status
      currency
      amount
      reason
      lastPaymentError
      link
      createdAt
    }
  }
}`,
};

export const workspaceQuotaQuery = {
  id: 'workspaceQuotaQuery' as const,
  operationName: 'workspaceQuota',
  definitionName: 'workspace',
  containsFile: false,
  query: `
query workspaceQuota($id: String!) {
  workspace(id: $id) {
    quota {
      name
      blobLimit
      storageQuota
      historyPeriod
      memberLimit
      memberCount
      humanReadable {
        name
        blobLimit
        storageQuota
        historyPeriod
        memberLimit
      }
      usedSize
    }
  }
}`,
};

export const approveWorkspaceTeamMemberMutation = {
  id: 'approveWorkspaceTeamMemberMutation' as const,
  operationName: 'approveWorkspaceTeamMember',
  definitionName: 'approveMember',
  containsFile: false,
  query: `
mutation approveWorkspaceTeamMember($workspaceId: String!, $userId: String!) {
  approveMember(workspaceId: $workspaceId, userId: $userId)
}`,
};

export const grantWorkspaceTeamMemberMutation = {
  id: 'grantWorkspaceTeamMemberMutation' as const,
  operationName: 'grantWorkspaceTeamMember',
  definitionName: 'grantMember',
  containsFile: false,
  query: `
mutation grantWorkspaceTeamMember($workspaceId: String!, $userId: String!, $permission: Permission!) {
  grantMember(workspaceId: $workspaceId, userId: $userId, permission: $permission)
}`,
};
