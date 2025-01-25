//
//  ChatTableView+Data.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import UIKit

extension ChatTableView {
  struct DataElement {
    enum CellType: String, CaseIterable {
      case base
      case chat
    }

    let type: CellType
    let object: AnyObject?

    init(type: CellType, object: AnyObject?) {
      self.type = type
      self.object = object
    }
  }
}

extension ChatTableView.DataElement.CellType {
  var cellClassType: ChatTableView.BaseCell.Type {
    switch self {
    case .base:
      ChatTableView.BaseCell.self
    case .chat:
      ChatTableView.ChatCell.self
    }
  }

  var cellIdentifier: String {
    NSStringFromClass(cellClassType)
  }
}

extension ChatTableView: UITableViewDelegate, UITableViewDataSource {
  func numberOfSections(in _: UITableView) -> Int {
    1
  }

  func tableView(_: UITableView, numberOfRowsInSection _: Int) -> Int {
    dataSource.count
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: dataSource[indexPath.row].type.cellIdentifier, for: indexPath) as! BaseCell
    let object = dataSource[indexPath.row].object
    cell.update(via: object)
    return cell
  }
}
