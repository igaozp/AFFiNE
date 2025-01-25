//
//  IntelligentsChatController+Chat.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/12/26.
//

import AffineGraphQL
import LDSwiftEventSource
import UIKit

extension IntelligentsChatController {
  @objc func chat_onLoad() {
    beginProgress()
    chat_createSession { session in
      self.sessionID = session ?? ""
      self.endProgress()
    } onFailure: { error in
      self.presentError(error) {
        if let nav = self.navigationController {
          nav.popViewController(animated: true)
        } else {
          self.dismiss(animated: true)
        }
      }
    }
  }

  @objc func chat_onSend() {
    beginProgress()
    let viewModel = inputBox.editor.viewModel.duplicate()
    inputBox.editor.viewModel.reset()
    inputBox.editor.updateValues()
    DispatchQueue.global().async {
      self.chat_onSendExecute(viewModel: viewModel)
      self.endProgress()
    }
  }
}

private extension IntelligentsChatController {
  func dispatchToMain(_ block: @escaping () -> Void) {
    if Thread.isMainThread {
      block()
    } else {
      DispatchQueue.main.async(execute: block)
    }
  }

  func beginProgress() {
    dispatchToMain { [self] in
      inputBox.isUserInteractionEnabled = false
      progressView.isHidden = false
      progressView.alpha = 0
      progressView.startAnimating()
      UIView.animate(withDuration: 0.25) {
        self.inputBox.editor.alpha = 0
        self.progressView.alpha = 1
      }
    }
  }

  func endProgress() {
    dispatchToMain { [self] in
      UIView.animate(withDuration: 0.3) {
        self.inputBox.editor.alpha = 1
        self.progressView.alpha = 0
      } completion: { _ in
        self.inputBox.isUserInteractionEnabled = true
        self.progressView.stopAnimating()
      }
    }
  }
}

private extension IntelligentsChatController {
  func chat_onError(_ error: Error) {
    // TODO: IMPL add error cell
    print("[*] chat error", error)
  }

  func chat_createSession(
    onSuccess: @escaping (String?) -> Void,
    onFailure: @escaping (Error) -> Void
  ) {
    Intelligents.qlClient.perform(
      mutation: CreateCopilotSessionMutation(options: .init(
        docId: "", // TODO: put the real data
        promptName: Prompt.general_Chat_With_AFFiNE_AI.rawValue,
        workspaceId: "" // TODO: put the real data
      )),
      queue: .global()
    ) { result in
      switch result {
      case let .success(value):
        if let session = value.data?.createCopilotSession {
          self.dispatchToMain { onSuccess(session) }
        } else {
          self.dispatchToMain {
            onFailure(
              NSError(
                domain: "Intelligents",
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "No session created"]
              )
            )
          }
        }
      case let .failure(error):
        self.dispatchToMain { onFailure(error) }
      }
    }
  }

  func chat_onSendExecute(viewModel: InputEditView.ViewModel) {
    let text = viewModel.text
    //    let images = viewModel.attachments

    dispatchToMain {
      self.insertIntoTableView(withChatModel: .init(
        participant: .user,
        markdownDocument: text
      ))
    }

    let sem = DispatchSemaphore(value: 0)
    let sessionID = sessionID
    Intelligents.qlClient.perform(
      mutation: CreateCopilotMessageMutation(options: .init(
        content: .init(stringLiteral: text),
        sessionId: sessionID
      )),
      queue: .global()
    ) { result in
      defer { sem.signal() }
      switch result {
      case let .success(value):
        if let messageID = value.data?.createCopilotMessage {
          print("[*] messageID", messageID)
          self.chat_processWithMessageID(sessionID: sessionID, messageID: messageID)
        } else {
          self.chat_onError(NSError(
            domain: "Intelligents",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: "No message created"]
          ))
        }
      case let .failure(error):
        self.chat_onError(error)
      }
    }

    sem.wait()
  }

  func chat_processWithMessageID(sessionID: String, messageID: String) {
    let url = Constant.affineUpstreamURL
      .appendingPathComponent("api")
      .appendingPathComponent("copilot")
      .appendingPathComponent("chat")
      .appendingPathComponent(sessionID)
      .appendingPathComponent("stream")
    var comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
    comps?.queryItems = [URLQueryItem(name: "messageId", value: messageID)]

    guard let url = comps?.url else {
      assertionFailure()
      chat_onError(NSError(
        domain: "Intelligents",
        code: 0,
        userInfo: [NSLocalizedDescriptionKey: "No message created"]
      ))
      return
    }

    let chatModel = ChatTableView.ChatCell.ViewModel(
      participant: .assistant,
      markdownDocument: ""
    )
    dispatchToMain { self.insertIntoTableView(withChatModel: chatModel) }

    let sem = DispatchSemaphore(value: 0)

    let eventHandler = BlockEventHandler()
    eventHandler.onOpenedBlock = {
      print("[*] chat opened")
    }
    eventHandler.onClosedBlock = {
      sem.signal()
      self.chatTask?.stop()
      self.chatTask = nil
    }
    eventHandler.onErrorBlock = { error in
      self.chat_onError(error)
    }
    eventHandler.onMessageBlock = { _, message in
      self.chat_onEvent(message.data, chatModel: chatModel)
    }
    let eventSource = EventSource(config: .init(handler: eventHandler, url: url))
    chatTask = eventSource
    eventSource.start()

    sem.wait()
  }

  func chat_onEvent(_ data: String, chatModel: ChatTableView.ChatCell.ViewModel) {
    dispatchToMain { [self] in
      chatModel.markdownDocument += data
      tableView.reloadData()
    }
  }
}
