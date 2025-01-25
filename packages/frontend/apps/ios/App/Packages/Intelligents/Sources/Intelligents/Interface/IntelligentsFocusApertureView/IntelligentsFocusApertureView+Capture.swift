//
//  IntelligentsFocusApertureView+Capture.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/21.
//

import UIKit

extension IntelligentsFocusApertureView {
  func captureImageBuffer(_ targetContentView: UIView) {
    let imageSize = targetContentView.frame.size
    let renderer = UIGraphicsImageRenderer(size: imageSize)
    let image = renderer.image { _ in
      targetContentView.drawHierarchy(
        in: targetContentView.bounds,
        afterScreenUpdates: false
      )
    }
    capturedImage = image
  }
}
