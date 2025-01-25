// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class ListWorkspaceFeaturesQuery: GraphQLQuery {
  public static let operationName: String = "listWorkspaceFeatures"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query listWorkspaceFeatures($feature: FeatureType!) { listWorkspaceFeatures(feature: $feature) { __typename id public createdAt memberCount owner { __typename id } features } }"#
    ))

  public var feature: GraphQLEnum<FeatureType>

  public init(feature: GraphQLEnum<FeatureType>) {
    self.feature = feature
  }

  public var __variables: Variables? { ["feature": feature] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("listWorkspaceFeatures", [ListWorkspaceFeature].self, arguments: ["feature": .variable("feature")]),
    ] }

    public var listWorkspaceFeatures: [ListWorkspaceFeature] { __data["listWorkspaceFeatures"] }

    /// ListWorkspaceFeature
    ///
    /// Parent Type: `WorkspaceType`
    public struct ListWorkspaceFeature: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.WorkspaceType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("id", AffineGraphQL.ID.self),
        .field("public", Bool.self),
        .field("createdAt", AffineGraphQL.DateTime.self),
        .field("memberCount", Int.self),
        .field("owner", Owner.self),
        .field("features", [GraphQLEnum<AffineGraphQL.FeatureType>].self),
      ] }

      public var id: AffineGraphQL.ID { __data["id"] }
      /// is Public workspace
      public var `public`: Bool { __data["public"] }
      /// Workspace created date
      public var createdAt: AffineGraphQL.DateTime { __data["createdAt"] }
      /// member count of workspace
      public var memberCount: Int { __data["memberCount"] }
      /// Owner of workspace
      public var owner: Owner { __data["owner"] }
      /// Enabled features of workspace
      public var features: [GraphQLEnum<AffineGraphQL.FeatureType>] { __data["features"] }

      /// ListWorkspaceFeature.Owner
      ///
      /// Parent Type: `UserType`
      public struct Owner: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.UserType }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", AffineGraphQL.ID.self),
        ] }

        public var id: AffineGraphQL.ID { __data["id"] }
      }
    }
  }
}
