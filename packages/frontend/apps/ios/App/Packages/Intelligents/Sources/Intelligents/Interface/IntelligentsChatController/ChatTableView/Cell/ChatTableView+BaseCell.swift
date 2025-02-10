//
//  ChatTableView+BaseCell.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import UIKit

private let initialInsetValue: CGFloat = 24

extension ChatTableView {
  class BaseCell: UITableViewCell {
    var inset: UIEdgeInsets { // available for overrides
      .init(
        top: initialInsetValue / 2,
        left: initialInsetValue,
        bottom: initialInsetValue / 2,
        right: initialInsetValue
      )
    }

    let containerView = UIView()
    let roundedBackgroundView = UIView()

    var viewModel: AnyObject? {
      didSet { update(via: viewModel) }
    }

    enum BackgroundColorType {
      case clear
      case highlight
      case warning
      case lightGray
    }

    var backgroundColorType: BackgroundColorType = .clear {
      didSet {
        roundedBackgroundView.backgroundColor = backgroundColorType.color
      }
    }

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
      super.init(style: style, reuseIdentifier: reuseIdentifier)
      selectionStyle = .none
      backgroundColor = .clear

      roundedBackgroundView.clipsToBounds = true
      roundedBackgroundView.layer.cornerRadius = 8
      roundedBackgroundView.layer.masksToBounds = true

      contentView.addSubview(roundedBackgroundView)
      roundedBackgroundView.translatesAutoresizingMaskIntoConstraints = false
      [ // inset half of the container view
        roundedBackgroundView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: inset.left / 2),
        roundedBackgroundView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -inset.right / 2),
        roundedBackgroundView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: inset.top / 2),
        roundedBackgroundView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -inset.bottom / 2),
      ].forEach { $0.isActive = true }

      contentView.addSubview(containerView)
      containerView.translatesAutoresizingMaskIntoConstraints = false
      [
        containerView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: inset.left),
        containerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -inset.right),
        containerView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: inset.top),
        containerView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -inset.bottom),
      ].forEach { $0.isActive = true }
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
      fatalError()
    }

    override func prepareForReuse() {
      super.prepareForReuse()
      viewModel = nil
    }

    func update(via object: AnyObject?) {
      _ = object
    }
  }
}

extension ChatTableView.BaseCell.BackgroundColorType {
  var color: UIColor {
    switch self {
    case .clear:
      .clear
    case .highlight:
      .accent
    case .warning:
      .systemRed.withAlphaComponent(0.1)
    case .lightGray:
      .systemGray.withAlphaComponent(0.1)
    }
  }
}
