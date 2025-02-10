//
//  ScrollBottom.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/12/23.
//

import Foundation
import UIKit

class ScrollBottom: UIView {
  let imageView = UIImageView()
  let backgroundView: UIView = UIVisualEffectView(
    effect: UIBlurEffect(style: .systemUltraThinMaterialDark)
  )

  var onTap: (() -> Void)?

  init() {
    super.init(frame: .zero)

    addSubview(backgroundView)
    addSubview(imageView)

    imageView.contentMode = .scaleAspectFit
    imageView.image = UIImage(systemName: "arrow.down")
    imageView.tintColor = .accent

    isUserInteractionEnabled = true
    let tapGesture = UITapGestureRecognizer(
      target: self,
      action: #selector(tapAction)
    )
    addGestureRecognizer(tapGesture)
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    clipsToBounds = true

    layer.cornerRadius = (bounds.width + bounds.height) / 4
    layer.masksToBounds = true

    backgroundView.frame = bounds
    let imageInset = (bounds.width + bounds.height) / 8
    imageView.frame = CGRect(
      x: imageInset,
      y: imageInset,
      width: bounds.width - 2 * imageInset,
      height: bounds.height - 2 * imageInset
    )
  }

  @objc private func tapAction() {
    onTap?()
  }
}
