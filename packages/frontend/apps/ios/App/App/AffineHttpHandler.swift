//
//  RequestUrlSchemeHandler.swift
//  App
//
//  Created by EYHN on 2025/1/9.
//

import WebKit

enum AffineHttpError: Error {
  case invalidOperation(reason: String), invalidState(reason: String)
}

class AffineHttpHandler: NSObject, WKURLSchemeHandler {
  func webView(_ webView: WKWebView, start urlSchemeTask: any WKURLSchemeTask) {
    urlSchemeTask.stopped = false
    guard let rawUrl = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(AffineHttpError.invalidOperation(reason: "bad request"))
      return
    }
    guard let scheme = rawUrl.scheme else {
      urlSchemeTask.didFailWithError(AffineHttpError.invalidOperation(reason: "bad request"))
      return
    }
    let httpProtocol = scheme == "affine-http" ? "http" : "https"
    guard let urlComponents = URLComponents(url: rawUrl, resolvingAgainstBaseURL: true) else {
      urlSchemeTask.didFailWithError(AffineHttpError.invalidOperation(reason: "bad request"))
      return
    }
    guard let host = urlComponents.host else {
      urlSchemeTask.didFailWithError(AffineHttpError.invalidOperation(reason: "bad url"))
      return
    }
    let path = urlComponents.path
    let query = urlComponents.query != nil ? "?\(urlComponents.query!)" : ""
    let port = urlComponents.port != nil ? ":\(urlComponents.port!)" : ""
    guard let targetUrl = URL(string: "\(httpProtocol)://\(host)\(port)\(path)\(query)") else {
      urlSchemeTask.didFailWithError(AffineHttpError.invalidOperation(reason: "bad url"))
      return
    }
    
    var request = URLRequest(url: targetUrl);
    request.httpMethod = urlSchemeTask.request.httpMethod;
    request.httpShouldHandleCookies = true
    request.httpBody = urlSchemeTask.request.httpBody
    urlSchemeTask.request.allHTTPHeaderFields?.filter({
      key, value in
      let normalizedKey = key.lowercased()
      return normalizedKey == "content-type" ||
      normalizedKey == "content-length" ||
      normalizedKey == "accept"
    }).forEach {
      key, value in
      request.setValue(value, forHTTPHeaderField: key)
    }
    
    let task = URLSession.shared.dataTask(with: request) {
      (rawData, rawResponse, error) in
      DispatchQueue.main.async {
        if urlSchemeTask.stopped {
          return
        }
        
        if error != nil {
          urlSchemeTask.didFailWithError(error!)
        } else {
          guard let httpResponse = rawResponse as? HTTPURLResponse else {
            urlSchemeTask.didFailWithError(AffineHttpError.invalidState(reason: "bad response"))
            return
          }
          let inheritedHeaders = httpResponse.allHeaderFields.filter({
            key, value in
            let normalizedKey = (key as? String)?.lowercased()
            return normalizedKey == "content-type" ||
            normalizedKey == "content-length"
          }) as? [String: String] ?? [:]
          let newHeaders: [String: String] = [
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*"
          ]
          
          guard let response = HTTPURLResponse.init(url: rawUrl, statusCode: httpResponse.statusCode, httpVersion: nil, headerFields: inheritedHeaders.merging(newHeaders, uniquingKeysWith: { (_, newHeaders) in newHeaders })) else {
            urlSchemeTask.didFailWithError(AffineHttpError.invalidState(reason: "failed to create response"))
            return
          }
          
          urlSchemeTask.didReceive(response)
          if rawData != nil {
            urlSchemeTask.didReceive(rawData!)
          }
          urlSchemeTask.didFinish()
        }
      }
    }
    task.resume()
    
    urlSchemeTask.dataTask = task
  }
  
  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    urlSchemeTask.stopped = true
    urlSchemeTask.dataTask?.cancel()
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
  var dataTask: URLSessionDataTask? {
    get {
      return objc_getAssociatedObject(self, &dataTaskKey) as? URLSessionDataTask
    }
    set {
      objc_setAssociatedObject(self, &dataTaskKey, newValue, .OBJC_ASSOCIATION_RETAIN)
    }
  }
}

private var stoppedKey = malloc(1)
private var dataTaskKey = malloc(1)
