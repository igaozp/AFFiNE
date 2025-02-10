//
//  ChatTableView.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import MSDisplayLink
import SpringInterpolation
import UIKit

class ChatTableView: UIView {
  let tableView = UITableView()
  let footerView = UIView()
  let scrollDownButton = ScrollBottom()

  var dataSource: [DataElement] = []

  // 控制自动滚动
  var scrollToBottomEnabled = false {
    didSet { animationEnabledToggleDidSet(oldValue: oldValue) }
  }

  // 要让系统自己的动画完成以后再帮用户去挪
  var scrollToBottomAllowed = false {
    didSet { animationAllowedToggleDidSet(oldValue: oldValue) }
  }

  var scrollAnimationController: DisplayLink = .init()
  var scrollAnimationContext: SpringInterpolation = .init()
  var scrollAnimationDeltaTimeHolder: Date = .init()

  init() {
    super.init(frame: .zero)

    for eachCase in DataElement.CellType.allCases {
      let cellClass = eachCase.cellClassType
      tableView.register(cellClass, forCellReuseIdentifier: eachCase.cellIdentifier)
    }

    tableView.backgroundColor = .clear

    tableView.delegate = self
    tableView.dataSource = self
    addSubview(tableView)

    tableView.translatesAutoresizingMaskIntoConstraints = false
    [
      tableView.topAnchor.constraint(equalTo: topAnchor),
      tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ].forEach { $0.isActive = true }

    footerView.translatesAutoresizingMaskIntoConstraints = false
    footerView.heightAnchor.constraint(equalToConstant: 128).isActive = true
    footerView.widthAnchor.constraint(equalToConstant: 128).isActive = true
    tableView.tableFooterView = footerView
    tableView.separatorStyle = .none

    addSubview(scrollDownButton)
    scrollDownButton.translatesAutoresizingMaskIntoConstraints = false
    [
      // right bottom inset 16 size 32x32
      scrollDownButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
      scrollDownButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -32),
      scrollDownButton.widthAnchor.constraint(equalToConstant: 32),
      scrollDownButton.heightAnchor.constraint(equalToConstant: 32),
    ].forEach { $0.isActive = true }
    scrollDownButton.alpha = 0
    scrollDownButton.onTap = { [weak self] in
      self?.scrollToBottom()
    }

    scrollAnimationController.delegatingObject(self)
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }

  func reloadData() {
    tableView.reloadData()
  }
}
