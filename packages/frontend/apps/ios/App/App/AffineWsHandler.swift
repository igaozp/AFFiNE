//
//  RequestUrlSchemeHandler.swift
//  App
//
//  Created by EYHN on 2025/1/9.
//

import WebKit

enum AffineWsError: Error {
  case invalidOperation(reason: String), invalidState(reason: String)
}

/**
 this custom url scheme handler simulates websocket connection through an http request.
 frontend open websocket connections and send messages by sending requests to affine-ws:// or affine-wss://
 the handler has two endpoints:
 `affine-ws:///open?uuid={uuid}&url={wsUrl}`: open a websocket connection and return received data through the SSE protocol. If the front-end closes the http connection, the websocket connection will also be closed.
 `affine-ws:///send?uuid={uuid}`: send the request body data to the websocket connection with the specified uuid.
 */
class AffineWsHandler: NSObject, WKURLSchemeHandler {
  var wsTasks: [UUID: URLSessionWebSocketTask] = [:]
  func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
    urlSchemeTask.stopped = false
    guard let rawUrl = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "bad request"))
      return
    }
    guard let urlComponents = URLComponents(url: rawUrl, resolvingAgainstBaseURL: true) else {
      urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "bad request"))
      return
    }
    let path = urlComponents.path
    if path == "/open" {
      guard let targetUrlStr = urlComponents.queryItems?.first(where: { $0.name == "url" })?.value else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "url is request"))
        return
      }
      
      guard let targetUrl = URL(string: targetUrlStr) else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "failed to parse url"))
        return
      }
      
      guard let uuidStr = urlComponents.queryItems?.first(where: { $0.name == "uuid" })?.value else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "url is request"))
        return
      }
      guard let uuid = UUID(uuidString: uuidStr) else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "invalid uuid"))
        return
      }
      
      guard let response = HTTPURLResponse.init(url: rawUrl, statusCode: 200, httpVersion: nil, headerFields: [
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*"
      ]) else {
        urlSchemeTask.didFailWithError(AffineHttpError.invalidState(reason: "failed to create response"))
        return
      }
      
      urlSchemeTask.didReceive(response)
      let jsonEncoder = JSONEncoder()
      let json = String(data: try! jsonEncoder.encode(["type": "start"]), encoding: .utf8)!
      urlSchemeTask.didReceive("data: \(json)\n\n".data(using: .utf8)!)
      
      var request = URLRequest(url: targetUrl);
      request.httpShouldHandleCookies = true
      
      let webSocketTask = URLSession.shared.webSocketTask(with: targetUrl)
      self.wsTasks[uuid] = webSocketTask
      webSocketTask.resume()
      
      urlSchemeTask.wsTask = webSocketTask
      
      var completionHandler: ((Result<URLSessionWebSocketTask.Message, any Error>) -> Void)!
      completionHandler = {
        let result = $0
        DispatchQueue.main.async {
          if urlSchemeTask.stopped {
            return
          }
          let jsonEncoder = JSONEncoder()
          switch result {
          case .success(let message):
            if case .string(let string) = message {
              let json = String(data: try! jsonEncoder.encode(["type": "message", "data": string]), encoding: .utf8)!
              urlSchemeTask.didReceive("data: \(json)\n\n".data(using: .utf8)!)
            }
          case .failure(let error):
            let json = String(data: try! jsonEncoder.encode(["type": "error", "error": error.localizedDescription]), encoding: .utf8)!
            urlSchemeTask.didReceive("data: \(json)\n\n".data(using: .utf8)!)
            urlSchemeTask.didFinish()
          }
        }
        
        // recursive calls
        webSocketTask.receive(completionHandler: completionHandler)
      }
      
      webSocketTask.receive(completionHandler: completionHandler)
    } else if path == "/send" {
      if urlSchemeTask.request.httpMethod != "POST" {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "Method should be POST"))
        return
      }
      guard let uuidStr = urlComponents.queryItems?.first(where: { $0.name == "uuid" })?.value else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "url is request"))
        return
      }
      guard let uuid = UUID(uuidString: uuidStr) else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "invalid uuid"))
        return
      }
      guard let ContentType = urlSchemeTask.request.allHTTPHeaderFields?.first(where: {$0.key.lowercased() == "content-type"})?.value else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "content-type is request"))
        return
      }
      if ContentType != "text/plain" {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "content-type not support"))
        return
      }
      guard let body = urlSchemeTask.request.httpBody else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "no body"))
        return
      }
      let stringBody = String(decoding: body, as: UTF8.self)
      guard let webSocketTask = self.wsTasks[uuid] else {
        urlSchemeTask.didFailWithError(AffineWsError.invalidOperation(reason: "connection not found"))
        return
      }
      
      guard let response = HTTPURLResponse.init(url: rawUrl, statusCode: 200, httpVersion: nil, headerFields: [
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*"
      ]) else {
        urlSchemeTask.didFailWithError(AffineHttpError.invalidState(reason: "failed to create response"))
        return
      }
      
      let jsonEncoder = JSONEncoder()
      
      webSocketTask.send(.string(stringBody), completionHandler: {
        error in
        DispatchQueue.main.async {
          if urlSchemeTask.stopped {
            return
          }
          if error != nil {
            let json = try! jsonEncoder.encode(["error": error!.localizedDescription])
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(json)
          } else {
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(try! jsonEncoder.encode(["uuid": uuid.uuidString.data(using: .utf8)!]))
            urlSchemeTask.didFinish()
          }
        }
      })
    }
  }
  
  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    urlSchemeTask.stopped = true
    urlSchemeTask.wsTask?.cancel(with: .abnormalClosure, reason: "Closed".data(using: .utf8))
  }
}

private extension WKURLSchemeTask {
  var stopped: Bool {
    get {
      return objc_getAssociatedObject(self, &stoppedKey) as? Bool ?? false
    }
    set {
      objc_setAssociatedObject(self, &stoppedKey, newValue, .OBJC_ASSOCIATION_ASSIGN)
    }
  }
  var wsTask: URLSessionWebSocketTask? {
    get {
      return objc_getAssociatedObject(self, &wsTaskKey) as? URLSessionWebSocketTask
    }
    set {
      objc_setAssociatedObject(self, &wsTaskKey, newValue, .OBJC_ASSOCIATION_RETAIN)
    }
  }
}

private var stoppedKey = malloc(1)
private var wsTaskKey = malloc(1)
