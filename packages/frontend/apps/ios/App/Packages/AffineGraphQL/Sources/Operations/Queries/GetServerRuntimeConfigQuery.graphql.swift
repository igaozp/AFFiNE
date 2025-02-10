// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class GetServerRuntimeConfigQuery: GraphQLQuery {
  public static let operationName: String = "getServerRuntimeConfig"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query getServerRuntimeConfig { serverRuntimeConfig { __typename id module key description value type updatedAt } }"#
    ))

  public init() {}

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("serverRuntimeConfig", [ServerRuntimeConfig].self),
    ] }

    /// get all server runtime configurable settings
    public var serverRuntimeConfig: [ServerRuntimeConfig] { __data["serverRuntimeConfig"] }

    /// ServerRuntimeConfig
    ///
    /// Parent Type: `ServerRuntimeConfigType`
    public struct ServerRuntimeConfig: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.ServerRuntimeConfigType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("id", String.self),
        .field("module", String.self),
        .field("key", String.self),
        .field("description", String.self),
        .field("value", AffineGraphQL.JSON.self),
        .field("type", GraphQLEnum<AffineGraphQL.RuntimeConfigType>.self),
        .field("updatedAt", AffineGraphQL.DateTime.self),
      ] }

      public var id: String { __data["id"] }
      public var module: String { __data["module"] }
      public var key: String { __data["key"] }
      public var description: String { __data["description"] }
      public var value: AffineGraphQL.JSON { __data["value"] }
      public var type: GraphQLEnum<AffineGraphQL.RuntimeConfigType> { __data["type"] }
      public var updatedAt: AffineGraphQL.DateTime { __data["updatedAt"] }
    }
  }
}
