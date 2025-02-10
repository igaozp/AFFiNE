//
//  IntelligentsChatController+Cell.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/12/26.
//

import Foundation

extension IntelligentsChatController {
  func insertIntoTableView(viewModel: ChatTableView.DataElement) {
    assert(Thread.isMainThread)
    tableView.dataSource.append(viewModel)
    tableView.reloadData()
  }

  func insertIntoTableView(withChatModel chatModel: ChatTableView.ChatCell.ViewModel) {
    insertIntoTableView(viewModel: .init(
      type: .chat,
      object: chatModel
    ))
  }

  func insertIntoTableView(withError error: Error) {
    insertIntoTableView(withChatModel: .init(
      participant: .system,
      markdownDocument: error.localizedDescription
    ))
  }
}
