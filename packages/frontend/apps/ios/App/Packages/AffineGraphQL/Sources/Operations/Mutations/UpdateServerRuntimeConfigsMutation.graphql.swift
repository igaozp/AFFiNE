// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class UpdateServerRuntimeConfigsMutation: GraphQLMutation {
  public static let operationName: String = "updateServerRuntimeConfigs"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation updateServerRuntimeConfigs($updates: JSONObject!) { updateRuntimeConfigs(updates: $updates) { __typename key value } }"#
    ))

  public var updates: JSONObject

  public init(updates: JSONObject) {
    self.updates = updates
  }

  public var __variables: Variables? { ["updates": updates] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("updateRuntimeConfigs", [UpdateRuntimeConfig].self, arguments: ["updates": .variable("updates")]),
    ] }

    /// update multiple server runtime configurable settings
    public var updateRuntimeConfigs: [UpdateRuntimeConfig] { __data["updateRuntimeConfigs"] }

    /// UpdateRuntimeConfig
    ///
    /// Parent Type: `ServerRuntimeConfigType`
    public struct UpdateRuntimeConfig: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.ServerRuntimeConfigType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("key", String.self),
        .field("value", AffineGraphQL.JSON.self),
      ] }

      public var key: String { __data["key"] }
      public var value: AffineGraphQL.JSON { __data["value"] }
    }
  }
}
