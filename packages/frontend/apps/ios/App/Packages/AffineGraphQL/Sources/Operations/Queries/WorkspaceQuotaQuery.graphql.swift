// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class WorkspaceQuotaQuery: GraphQLQuery {
  public static let operationName: String = "workspaceQuota"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query workspaceQuota($id: String!) { workspace(id: $id) { __typename quota { __typename name blobLimit storageQuota historyPeriod memberLimit memberCount humanReadable { __typename name blobLimit storageQuota historyPeriod memberLimit } usedSize } } }"#
    ))

  public var id: String

  public init(id: String) {
    self.id = id
  }

  public var __variables: Variables? { ["id": id] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("workspace", Workspace.self, arguments: ["id": .variable("id")]),
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
        .field("quota", Quota.self),
      ] }

      /// quota of workspace
      public var quota: Quota { __data["quota"] }

      /// Workspace.Quota
      ///
      /// Parent Type: `QuotaQueryType`
      public struct Quota: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.QuotaQueryType }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("name", String.self),
          .field("blobLimit", AffineGraphQL.SafeInt.self),
          .field("storageQuota", AffineGraphQL.SafeInt.self),
          .field("historyPeriod", AffineGraphQL.SafeInt.self),
          .field("memberLimit", AffineGraphQL.SafeInt.self),
          .field("memberCount", AffineGraphQL.SafeInt.self),
          .field("humanReadable", HumanReadable.self),
          .field("usedSize", AffineGraphQL.SafeInt.self),
        ] }

        public var name: String { __data["name"] }
        public var blobLimit: AffineGraphQL.SafeInt { __data["blobLimit"] }
        public var storageQuota: AffineGraphQL.SafeInt { __data["storageQuota"] }
        public var historyPeriod: AffineGraphQL.SafeInt { __data["historyPeriod"] }
        public var memberLimit: AffineGraphQL.SafeInt { __data["memberLimit"] }
        public var memberCount: AffineGraphQL.SafeInt { __data["memberCount"] }
        public var humanReadable: HumanReadable { __data["humanReadable"] }
        public var usedSize: AffineGraphQL.SafeInt { __data["usedSize"] }

        /// Workspace.Quota.HumanReadable
        ///
        /// Parent Type: `HumanReadableQuotaType`
        public struct HumanReadable: AffineGraphQL.SelectionSet {
          public let __data: DataDict
          public init(_dataDict: DataDict) { __data = _dataDict }

          public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.HumanReadableQuotaType }
          public static var __selections: [ApolloAPI.Selection] { [
            .field("__typename", String.self),
            .field("name", String.self),
            .field("blobLimit", String.self),
            .field("storageQuota", String.self),
            .field("historyPeriod", String.self),
            .field("memberLimit", String.self),
          ] }

          public var name: String { __data["name"] }
          public var blobLimit: String { __data["blobLimit"] }
          public var storageQuota: String { __data["storageQuota"] }
          public var historyPeriod: String { __data["historyPeriod"] }
          public var memberLimit: String { __data["memberLimit"] }
        }
      }
    }
  }
}
