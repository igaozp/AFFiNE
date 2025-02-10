//
//  ChatTableView+Scroll.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/12/23.
//

import MSDisplayLink
import SpringInterpolation
import UIKit

extension ChatTableView: UIScrollViewDelegate, DisplayLinkDelegate {
  func synchronization() {
    let now = Date()
    defer { scrollAnimationDeltaTimeHolder = now }
    var deltaTime = now.timeIntervalSince(scrollAnimationDeltaTimeHolder)
    if deltaTime > 0.5 { deltaTime = 0.5 }
    guard scrollToBottomEnabled else { return }
    DispatchQueue.main.async { self.tikVsync(deltaTime: deltaTime * 2) }
  }

  var bottomLocationY: CGFloat {
    tableView.contentSize.height - tableView.bounds.height
  }

  private func tikVsync(deltaTime: TimeInterval) {
    guard scrollToBottomEnabled else { return }
    guard scrollToBottomAllowed else { return }
    // read from contentSize if not needed to scroll
    guard tableView.contentSize.height > tableView.bounds.height else {
      resetAnimationContext(to: tableView.contentOffset.y)
      return
    }
    guard abs(bottomLocationY - tableView.contentOffset.y) > 1 else {
      return
    }
    scrollAnimationContext.setTarget(bottomLocationY)
    scrollAnimationContext.update(withDeltaTime: deltaTime)
    tableView.contentOffset.y = scrollAnimationContext.value
  }

  @inline(__always)
  func resetAnimationContext(to offset: CGFloat) {
    scrollAnimationContext.context = .init(
      currentPos: offset,
      currentVel: 0,
      targetPos: offset
    )
  }

  func presentScrollBottomIfNeeded() {
    let visible = !scrollToBottomEnabled && scrollToBottomAllowed
    UIView.animate(withDuration: 0.25) { [self] in
      scrollDownButton.alpha = visible ? 1 : 0
    }
  }

  func animationEnabledToggleDidSet(oldValue: Bool) {
    assert(Thread.isMainThread)
    guard scrollToBottomEnabled != oldValue else { return }
    resetAnimationContext(to: tableView.contentOffset.y)
  }

  func animationAllowedToggleDidSet(oldValue: Bool) {
    assert(Thread.isMainThread)
    guard scrollToBottomAllowed != oldValue else { return }
    resetAnimationContext(to: tableView.contentOffset.y)
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    processScrollView(scrollView)
  }

  func scrollViewDidEndDragging(_ scrollView: UIScrollView, willDecelerate _: Bool) {
    processScrollView(scrollView)
  }

  func scrollViewDidEndScrollingAnimation(_ scrollView: UIScrollView) {
    processScrollView(scrollView)
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    processScrollView(scrollView)
  }

  @inline(__always)
  private func processScrollView(_ scrollView: UIScrollView) {
    guard let tableView = scrollView as? UITableView else {
      assertionFailure()
      return
    }
    processTableViewMovements(tableView)
  }

  private func processTableViewMovements(_ tableView: UITableView) {
    defer { presentScrollBottomIfNeeded() }
    if tableView.isDragging {
      scrollToBottomEnabled = false
      scrollToBottomAllowed = false
    } else {
      // 如果没在减速 就开启 允许滚动
      scrollToBottomAllowed = !tableView.isDecelerating
      // 如果滚到底了 就开启 自动滚动
      let isBottom = tableView.contentOffset.y >= bottomLocationY
      if isBottom { scrollToBottomEnabled = true }
    }
  }

  func scrollToBottom() {
    scrollToBottomEnabled = true
    scrollToBottomAllowed = true
  }
}
