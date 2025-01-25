import Capacitor
import Intelligents
import UIKit

class AFFiNEViewController: CAPBridgeViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    webView?.allowsBackForwardNavigationGestures = true
    navigationController?.navigationBar.isHidden = true
    extendedLayoutIncludesOpaqueBars = false
    edgesForExtendedLayout = []
    let intelligentsButton = installIntelligentsButton()
    intelligentsButton.delegate = self
    dismissIntelligentsButton()
  }
  
  override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
    let configuration = super.webViewConfiguration(for: instanceConfiguration)
    return configuration
  }
  
  override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
    configuration.setURLSchemeHandler(AffineHttpHandler(), forURLScheme: "affine-http")
    configuration.setURLSchemeHandler(AffineHttpHandler(), forURLScheme: "affine-https")
    configuration.setURLSchemeHandler(AffineWsHandler(), forURLScheme: "affine-ws")
    configuration.setURLSchemeHandler(AffineWsHandler(), forURLScheme: "affine-wss")
    return super.webView(with: frame, configuration: configuration)
}

  override func capacitorDidLoad() {
    let plugins: [CAPPlugin] = [
      CookiePlugin(),
      HashcashPlugin(),
      NavigationGesturePlugin(),
      IntelligentsPlugin(representController: self),
      NbStorePlugin(),
    ]
    plugins.forEach { bridge?.registerPluginInstance($0) }
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    navigationController?.setNavigationBarHidden(false, animated: animated)
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
  }
}

extension AFFiNEViewController: IntelligentsButtonDelegate, IntelligentsFocusApertureViewDelegate {
  func onIntelligentsButtonTapped(_ button: IntelligentsButton) {
    guard let webView else {
      assertionFailure() // ? wdym ?
      return
    }

    button.beginProgress()

    let upstreamReaderScript = "window.getCurrentServerBaseUrl();"
    webView.evaluateJavaScript(upstreamReaderScript) { result, _ in
      if let baseUrl = result as? String {
        Intelligents.setUpstreamEndpoint(baseUrl)
      }

      let script = "return await window.getCurrentDocContentInMarkdown();"
      webView.callAsyncJavaScript(
        script,
        arguments: [:],
        in: nil,
        in: .page
      ) { result in
        button.stopProgress()
        webView.resignFirstResponder()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
          if case let .success(content) = result,
             let res = content as? String
          {
            print("[*] \(self) received document with \(res.count) characters")
            self.openIntelligentsSheet(withContext: res)
          } else {
            self.openSimpleChat()
          }
        }
      }
    }
  }

  func openIntelligentsSheet(withContext context: String) {
    guard let view = webView?.subviews.first else {
      assertionFailure()
      return
    }
    assert(view is UIScrollView)
    _ = context
    let focus = IntelligentsFocusApertureView()
    focus.prepareAnimationWith(
      capturingTargetContentView: view,
      coveringRootViewController: self
    )
    focus.delegate = self
    focus.executeAnimationKickIn()
    dismissIntelligentsButton()
  }

  func openSimpleChat() {
    let targetController = IntelligentsChatController()
    presentIntoCurrentContext(withTargetController: targetController)
  }

  func focusApertureRequestAction(actionType: IntelligentsFocusApertureViewActionType) {
    switch actionType {
    case .translateTo:
      fatalError("not implemented")
    case .summary:
      fatalError("not implemented")
    case .chatWithAI:
      let controller = IntelligentsChatController()
      presentIntoCurrentContext(withTargetController: controller)
    case .dismiss:
      presentIntelligentsButton()
    }
  }
}
