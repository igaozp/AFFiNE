// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class GetServerServiceConfigsQuery: GraphQLQuery {
  public static let operationName: String = "getServerServiceConfigs"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query getServerServiceConfigs { serverServiceConfigs { __typename name config } }"#
    ))

  public init() {}

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("serverServiceConfigs", [ServerServiceConfig].self),
    ] }

    public var serverServiceConfigs: [ServerServiceConfig] { __data["serverServiceConfigs"] }

    /// ServerServiceConfig
    ///
    /// Parent Type: `ServerServiceConfig`
    public struct ServerServiceConfig: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.ServerServiceConfig }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("name", String.self),
        .field("config", AffineGraphQL.JSONObject.self),
      ] }

      public var name: String { __data["name"] }
      public var config: AffineGraphQL.JSONObject { __data["config"] }
    }
  }
}
