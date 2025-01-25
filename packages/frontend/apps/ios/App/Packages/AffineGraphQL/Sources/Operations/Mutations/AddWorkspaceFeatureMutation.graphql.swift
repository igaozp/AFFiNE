// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class AddWorkspaceFeatureMutation: GraphQLMutation {
  public static let operationName: String = "addWorkspaceFeature"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation addWorkspaceFeature($workspaceId: String!, $feature: FeatureType!) { addWorkspaceFeature(workspaceId: $workspaceId, feature: $feature) }"#
    ))

  public var workspaceId: String
  public var feature: GraphQLEnum<FeatureType>

  public init(
    workspaceId: String,
    feature: GraphQLEnum<FeatureType>
  ) {
    self.workspaceId = workspaceId
    self.feature = feature
  }

  public var __variables: Variables? { [
    "workspaceId": workspaceId,
    "feature": feature
  ] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("addWorkspaceFeature", Int.self, arguments: [
        "workspaceId": .variable("workspaceId"),
        "feature": .variable("feature")
      ]),
    ] }

    public var addWorkspaceFeature: Int { __data["addWorkspaceFeature"] }
  }
}
