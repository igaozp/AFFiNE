//
//  IntelligentsChatController+Keyboard.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/12/6.
//

import UIKit

extension IntelligentsChatController {
  @objc func keyboardWillAppear(_ notification: Notification) {
    let info = notification.userInfo ?? [:]
    let keyboardHeight = (info[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?
      .cgRectValue
      .height ?? 0
    inputBoxKeyboardAdapterHeightConstraint.constant = keyboardHeight
    view.setNeedsUpdateConstraints()
    animateWithKeyboard(userInfo: info)
  }

  @objc func keyboardWillDisappear(_ notification: Notification) {
    let info = notification.userInfo ?? [:]
    inputBoxKeyboardAdapterHeightConstraint.constant = 0
    view.setNeedsUpdateConstraints()
    animateWithKeyboard(userInfo: info)
  }

  private func animateWithKeyboard(userInfo info: [AnyHashable: Any]) {
    let keyboardAnimationDuration = (info[UIResponder.keyboardAnimationDurationUserInfoKey] as? NSNumber)?
      .doubleValue ?? 0
    let keyboardAnimationCurve = (info[UIResponder.keyboardAnimationCurveUserInfoKey] as? NSNumber)?
      .uintValue ?? 0
    UIView.animate(
      withDuration: keyboardAnimationDuration,
      delay: 0,
      options: UIView.AnimationOptions(rawValue: keyboardAnimationCurve),
      animations: {
        self.view.layoutIfNeeded()
      },
      completion: nil
    )
  }
}
