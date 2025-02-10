// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class PublishPageMutation: GraphQLMutation {
  public static let operationName: String = "publishPage"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation publishPage($workspaceId: String!, $pageId: String!, $mode: PublicPageMode = Page) { publishPage(workspaceId: $workspaceId, pageId: $pageId, mode: $mode) { __typename id mode } }"#
    ))

  public var workspaceId: String
  public var pageId: String
  public var mode: GraphQLNullable<GraphQLEnum<PublicPageMode>>

  public init(
    workspaceId: String,
    pageId: String,
    mode: GraphQLNullable<GraphQLEnum<PublicPageMode>> = .init(.page)
  ) {
    self.workspaceId = workspaceId
    self.pageId = pageId
    self.mode = mode
  }

  public var __variables: Variables? { [
    "workspaceId": workspaceId,
    "pageId": pageId,
    "mode": mode
  ] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("publishPage", PublishPage.self, arguments: [
        "workspaceId": .variable("workspaceId"),
        "pageId": .variable("pageId"),
        "mode": .variable("mode")
      ]),
    ] }

    public var publishPage: PublishPage { __data["publishPage"] }

    /// PublishPage
    ///
    /// Parent Type: `WorkspacePage`
    public struct PublishPage: AffineGraphQL.SelectionSet {
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
