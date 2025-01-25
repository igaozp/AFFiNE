// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class SetWorkspaceExperimentalFeatureMutation: GraphQLMutation {
  public static let operationName: String = "setWorkspaceExperimentalFeature"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation setWorkspaceExperimentalFeature($workspaceId: String!, $feature: FeatureType!, $enable: Boolean!) { setWorkspaceExperimentalFeature( workspaceId: $workspaceId feature: $feature enable: $enable ) }"#
    ))

  public var workspaceId: String
  public var feature: GraphQLEnum<FeatureType>
  public var enable: Bool

  public init(
    workspaceId: String,
    feature: GraphQLEnum<FeatureType>,
    enable: Bool
  ) {
    self.workspaceId = workspaceId
    self.feature = feature
    self.enable = enable
  }

  public var __variables: Variables? { [
    "workspaceId": workspaceId,
    "feature": feature,
    "enable": enable
  ] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("setWorkspaceExperimentalFeature", Bool.self, arguments: [
        "workspaceId": .variable("workspaceId"),
        "feature": .variable("feature"),
        "enable": .variable("enable")
      ]),
    ] }

    public var setWorkspaceExperimentalFeature: Bool { __data["setWorkspaceExperimentalFeature"] }
  }
}
