//
//  ChatTableView+ChatCell.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import MarkdownUI
import UIKit

extension ChatTableView {
  class ChatCell: BaseCell {
    let avatarView = CircleImageView()
    let titleLabel = UILabel()
    let markdownContainer = UIView()

    var markdownView: UIView?
    var removableConstraints: [NSLayoutConstraint] = []

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
      super.init(style: style, reuseIdentifier: reuseIdentifier)

      let spacingElement: CGFloat = 12
      let avatarSize: CGFloat = 24

      containerView.addSubview(avatarView)
      avatarView.translatesAutoresizingMaskIntoConstraints = false
      [
        avatarView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
        avatarView.topAnchor.constraint(equalTo: containerView.topAnchor),
        avatarView.widthAnchor.constraint(equalToConstant: avatarSize),
        avatarView.heightAnchor.constraint(equalToConstant: avatarSize),
      ].forEach { $0.isActive = true }

      titleLabel.font = .systemFont(ofSize: UIFont.labelFontSize, weight: .bold)
      containerView.addSubview(titleLabel)
      titleLabel.translatesAutoresizingMaskIntoConstraints = false
      [
        titleLabel.leadingAnchor.constraint(equalTo: avatarView.trailingAnchor, constant: spacingElement),
        titleLabel.centerYAnchor.constraint(equalTo: avatarView.centerYAnchor),
        titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
      ].forEach { $0.isActive = true }

      containerView.addSubview(markdownContainer)
      markdownContainer.translatesAutoresizingMaskIntoConstraints = false
      [
        markdownContainer.topAnchor.constraint(greaterThanOrEqualTo: avatarView.bottomAnchor, constant: spacingElement),
        markdownContainer.topAnchor.constraint(greaterThanOrEqualTo: titleLabel.bottomAnchor, constant: spacingElement),
        markdownContainer.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 0),
        markdownContainer.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: 0),
        markdownContainer.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: 0),
      ].forEach { $0.isActive = true }
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
      fatalError()
    }

    override func update(via object: AnyObject?) {
      super.update(via: object)

      guard let viewModel = object as? ViewModel else {
        return
      }

      switch viewModel.participant {
      case .system:
        avatarView.image = UIImage(systemName: "gearshape.fill")
        titleLabel.text = "System".localized()
        backgroundColorType = .warning
      case .assistant:
        avatarView.image = UIImage(named: "spark", in: .module, with: .none)
        titleLabel.text = "AFFiNE AI".localized()
        backgroundColorType = .lightGray
      case .user:
        avatarView.image = UIImage(systemName: "person.fill")
        titleLabel.text = "You".localized()
        backgroundColorType = .clear
      }

      removableConstraints.forEach { $0.isActive = false }
      if let markdownView { markdownView.removeFromSuperview() }
      markdownContainer.subviews.forEach { $0.removeFromSuperview() }

      let hostingView: UIView = UIHostingView(
        rootView: Markdown(.init(viewModel.markdownDocument))
      )
      defer { markdownView = hostingView }
      markdownContainer.addSubview(hostingView)

      hostingView.translatesAutoresizingMaskIntoConstraints = false
      [
        hostingView.topAnchor.constraint(equalTo: markdownContainer.topAnchor),
        hostingView.leadingAnchor.constraint(equalTo: markdownContainer.leadingAnchor),
        hostingView.trailingAnchor.constraint(lessThanOrEqualTo: markdownContainer.trailingAnchor),
        hostingView.bottomAnchor.constraint(equalTo: markdownContainer.bottomAnchor),
      ].forEach {
        $0.isActive = true
        removableConstraints.append($0)
      }
    }
  }
}

extension ChatTableView.ChatCell {
  class ViewModel {
    let participant: Participant
    var markdownDocument: String

    init(participant: Participant, markdownDocument: String) {
      self.participant = participant
      self.markdownDocument = markdownDocument
    }
  }
}

extension ChatTableView.ChatCell.ViewModel {
  enum Participant {
    case user
    case assistant
    case system
  }
}
