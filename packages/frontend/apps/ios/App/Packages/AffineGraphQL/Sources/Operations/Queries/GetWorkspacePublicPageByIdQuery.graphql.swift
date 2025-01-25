// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class GetWorkspacePublicPageByIdQuery: GraphQLQuery {
  public static let operationName: String = "getWorkspacePublicPageById"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query getWorkspacePublicPageById($workspaceId: String!, $pageId: String!) { workspace(id: $workspaceId) { __typename publicPage(pageId: $pageId) { __typename id mode } } }"#
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

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("workspace", Workspace.self, arguments: ["id": .variable("workspaceId")]),
    ] }

    /// Get workspace by id
    public var workspace: Workspace { __data["workspace"] }

    /// Workspace
    ///
    /// Parent Type: `WorkspaceType`
    public struct Workspace: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.WorkspaceType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("publicPage", PublicPage?.self, arguments: ["pageId": .variable("pageId")]),
      ] }

      /// Get public page of a workspace by page id.
      public var publicPage: PublicPage? { __data["publicPage"] }

      /// Workspace.PublicPage
      ///
      /// Parent Type: `WorkspacePage`
      public struct PublicPage: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.WorkspacePage }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", String.self),
          .field("mode", GraphQLEnum<AffineGraphQL.PublicPageMode>.self),
        ] }

        public var id: String { __data["id"] }
        public var mode: GraphQLEnum<AffineGraphQL.PublicPageMode> { __data["mode"] }
      }
    }
  }
}
