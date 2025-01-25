//
//  IntelligentsFocusApertureView.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/21.
//

import UIKit

public class IntelligentsFocusApertureView: UIView {
  let backgroundView = UIView()
  let snapshotView = UIImageView()
  let controlButtonsPanel = ControlButtonsPanel()

  public var animationDuration: TimeInterval = 0.75

  public internal(set) weak var targetView: UIView?
  public internal(set) weak var targetViewController: UIViewController?
  public internal(set) weak var capturedImage: UIImage? {
    get { snapshotView.image }
    set { snapshotView.image = newValue }
  }

  var frameConstraints: [NSLayoutConstraint] = []
  var contentBeginConstraints: [NSLayoutConstraint] = []
  var contentFinalConstraints: [NSLayoutConstraint] = []

  public weak var delegate: (any IntelligentsFocusApertureViewDelegate)?

  public init() {
    super.init(frame: .zero)

    backgroundView.backgroundColor = .black
    backgroundView.isUserInteractionEnabled = true
    backgroundView.addGestureRecognizer(UITapGestureRecognizer(
      target: self,
      action: #selector(dismissFocus)
    ))

    snapshotView.setContentHuggingPriority(.defaultLow, for: .vertical)
    snapshotView.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
    snapshotView.layer.contentsGravity = .top
    snapshotView.layer.masksToBounds = true
    snapshotView.contentMode = .scaleAspectFill
    snapshotView.isUserInteractionEnabled = true
    snapshotView.addGestureRecognizer(UITapGestureRecognizer(
      target: self,
      action: #selector(dismissFocus)
    ))

    addSubview(backgroundView)
    addSubview(controlButtonsPanel)
    addSubview(snapshotView)
    bringSubviewToFront(snapshotView)

    controlButtonsPanel.translateButton.action = { [weak self] in
      self?.delegate?.focusApertureRequestAction(actionType: .translateTo)
    }
    controlButtonsPanel.summaryButton.action = { [weak self] in
      self?.delegate?.focusApertureRequestAction(actionType: .summary)
    }
    controlButtonsPanel.chatWithAIButton.action = { [weak self] in
      self?.delegate?.focusApertureRequestAction(actionType: .chatWithAI)
    }
    removeEveryAutoResizingMasks()
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }

  public func prepareAnimationWith(
    capturingTargetContentView targetContentView: UIView,
    coveringRootViewController viewController: UIViewController
  ) {
    captureImageBuffer(targetContentView)

    targetView = targetContentView
    targetViewController = viewController

    viewController.view.addSubview(self)

    prepareFrameLayout()
    prepareContentLayouts()
    activateLayoutForAnimation(.begin)
  }

  public func executeAnimationKickIn(_ completion: @escaping () -> Void = {}) {
    activateLayoutForAnimation(.begin)
    isUserInteractionEnabled = false
    UIView.animate(
      withDuration: animationDuration,
      delay: 0,
      usingSpringWithDamping: 1.0,
      initialSpringVelocity: 0.8
    ) {
      self.activateLayoutForAnimation(.complete)
    } completion: { _ in
      self.isUserInteractionEnabled = true
      completion()
    }
  }

  public func executeAnimationDismiss(_ completion: @escaping () -> Void = {}) {
    activateLayoutForAnimation(.complete)
    isUserInteractionEnabled = false
    UIView.animate(
      withDuration: animationDuration,
      delay: 0,
      usingSpringWithDamping: 1.0,
      initialSpringVelocity: 0.8
    ) {
      self.activateLayoutForAnimation(.begin)
    } completion: { _ in
      self.isUserInteractionEnabled = true
      completion()
    }
  }

  @objc func dismissFocus() {
    isUserInteractionEnabled = false
    executeAnimationDismiss {
      self.removeFromSuperview()
      self.delegate?.focusApertureRequestAction(actionType: .dismiss)
    }
  }
}
