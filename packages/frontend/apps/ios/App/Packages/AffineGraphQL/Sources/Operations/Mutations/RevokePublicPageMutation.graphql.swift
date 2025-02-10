// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class RevokePublicPageMutation: GraphQLMutation {
  public static let operationName: String = "revokePublicPage"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation revokePublicPage($workspaceId: String!, $pageId: String!) { revokePublicPage(workspaceId: $workspaceId, pageId: $pageId) { __typename id mode public } }"#
    ))

  public var workspaceId: String
  public var pageId: String

  public init(
    workspaceId: String,
    pageId: String
  ) {
    self.workspaceId = workspaceId
    self.pageId = pageId
  }

  public var __variables: Variables? { [
    "workspaceId": workspaceId,
    "pageId": pageId
  ] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("revokePublicPage", RevokePublicPage.self, arguments: [
        "workspaceId": .variable("workspaceId"),
        "pageId": .variable("pageId")
      ]),
    ] }

    public var revokePublicPage: RevokePublicPage { __data["revokePublicPage"] }

    /// RevokePublicPage
    ///
    /// Parent Type: `WorkspacePage`
    public struct RevokePublicPage: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.WorkspacePage }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("id", String.self),
        .field("mode", GraphQLEnum<AffineGraphQL.PublicPageMode>.self),
        .field("public", Bool.self),
      ] }

      public var id: String { __data["id"] }
      public var mode: GraphQLEnum<AffineGraphQL.PublicPageMode> { __data["mode"] }
      public var `public`: Bool { __data["public"] }
    }
  }
}
