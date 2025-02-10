// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public protocol SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == AffineGraphQL.SchemaMetadata {}

public protocol InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == AffineGraphQL.SchemaMetadata {}

public protocol MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == AffineGraphQL.SchemaMetadata {}

public protocol MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == AffineGraphQL.SchemaMetadata {}

public enum SchemaMetadata: ApolloAPI.SchemaMetadata {
  public static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

  public static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
    switch typename {
    case "ChatMessage": return AffineGraphQL.Objects.ChatMessage
    case "Copilot": return AffineGraphQL.Objects.Copilot
    case "CopilotHistories": return AffineGraphQL.Objects.CopilotHistories
    case "CopilotPromptConfigType": return AffineGraphQL.Objects.CopilotPromptConfigType
    case "CopilotPromptMessageType": return AffineGraphQL.Objects.CopilotPromptMessageType
    case "CopilotPromptType": return AffineGraphQL.Objects.CopilotPromptType
    case "CopilotQuota": return AffineGraphQL.Objects.CopilotQuota
    case "CredentialsRequirementType": return AffineGraphQL.Objects.CredentialsRequirementType
    case "DeleteAccount": return AffineGraphQL.Objects.DeleteAccount
    case "DocHistoryType": return AffineGraphQL.Objects.DocHistoryType
    case "EditorType": return AffineGraphQL.Objects.EditorType
    case "InvitationType": return AffineGraphQL.Objects.InvitationType
    case "InvitationWorkspaceType": return AffineGraphQL.Objects.InvitationWorkspaceType
    case "InviteLink": return AffineGraphQL.Objects.InviteLink
    case "InviteResult": return AffineGraphQL.Objects.InviteResult
    case "InviteUserType": return AffineGraphQL.Objects.InviteUserType
    case "InvoiceType": return AffineGraphQL.Objects.InvoiceType
    case "LimitedUserType": return AffineGraphQL.Objects.LimitedUserType
    case "ListedBlob": return AffineGraphQL.Objects.ListedBlob
    case "Mutation": return AffineGraphQL.Objects.Mutation
    case "PasswordLimitsType": return AffineGraphQL.Objects.PasswordLimitsType
    case "Query": return AffineGraphQL.Objects.Query
    case "RemoveAvatar": return AffineGraphQL.Objects.RemoveAvatar
    case "ServerConfigType": return AffineGraphQL.Objects.ServerConfigType
    case "ServerRuntimeConfigType": return AffineGraphQL.Objects.ServerRuntimeConfigType
    case "ServerServiceConfig": return AffineGraphQL.Objects.ServerServiceConfig
    case "SubscriptionPrice": return AffineGraphQL.Objects.SubscriptionPrice
    case "SubscriptionType": return AffineGraphQL.Objects.SubscriptionType
    case "UserQuotaHumanReadableType": return AffineGraphQL.Objects.UserQuotaHumanReadableType
    case "UserQuotaType": return AffineGraphQL.Objects.UserQuotaType
    case "UserQuotaUsageType": return AffineGraphQL.Objects.UserQuotaUsageType
    case "UserType": return AffineGraphQL.Objects.UserType
    case "WorkspacePage": return AffineGraphQL.Objects.WorkspacePage
    case "WorkspacePageMeta": return AffineGraphQL.Objects.WorkspacePageMeta
    case "WorkspaceQuotaHumanReadableType": return AffineGraphQL.Objects.WorkspaceQuotaHumanReadableType
    case "WorkspaceQuotaType": return AffineGraphQL.Objects.WorkspaceQuotaType
    case "WorkspaceType": return AffineGraphQL.Objects.WorkspaceType
    case "tokenType": return AffineGraphQL.Objects.TokenType
    default: return nil
    }
  }
}

public enum Objects {}
public enum Interfaces {}
public enum Unions {}
