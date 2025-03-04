//
//  UIPageViewControllerPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/12/6.
//

import UIKit

// 页面内容控制器
class UIPageViewContentViewController: UIViewController {
	var index: Int = 0 // 页索引

	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .systemBlue // 设置背景颜色

		// 添加页面编号标签
		let label = UILabel(frame: view.bounds)
		label.text = "Page \(index + 1)" // 页面编号（从 1 开始）
		label.textColor = .white
		label.textAlignment = .center
		label.font = .boldSystemFont(ofSize: 32)
		view.addSubview(label)
	}
}

// 主视图控制器
class UIPageViewControllerPlayground: UIViewController {
	var pageViewController: UIPageViewController!
	let totalPageCount = 5 // 总页数
	let pageContents = ["Welcome", "Discover", "Explore", "Learn", "Enjoy"] // 每页的内容

	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .white
		title = "UIPageViewController Example"
		setupPageViewController()
	}

	// 设置 UIPageViewController
	func setupPageViewController() {
		pageViewController = UIPageViewController(
			transitionStyle: .scroll,
			navigationOrientation: .horizontal,
			options: nil
		)
		pageViewController.dataSource = self
		// pageViewController.delegate = self

		// 设置初始页面
		let initialVC = viewControllerAtIndex(0)
		pageViewController.setViewControllers(
			[initialVC],
			direction: .forward,
			animated: false,
			completion: nil
		)

		// 将 UIPageViewController 添加到当前视图控制器
		addChild(pageViewController)
		view.addSubview(pageViewController.view)
		pageViewController.didMove(toParent: self)

		// 添加约束，确保 UIPageViewController 占满屏幕
		pageViewController.view.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			pageViewController.view.topAnchor.constraint(equalTo: view.topAnchor),
			pageViewController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
			pageViewController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
			pageViewController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
		])
	}

	// 根据索引返回页面内容控制器
	func viewControllerAtIndex(_ index: Int) -> UIPageViewContentViewController {
		let contentVC = UIPageViewContentViewController()
		contentVC.index = index
		return contentVC
	}

}

extension UIPageViewControllerPlayground: UIPageViewControllerDataSource {
	// 返回前一个页面
	func pageViewController(_ pageViewController: UIPageViewController,
							viewControllerBefore viewController: UIViewController) -> UIViewController? {
		guard let currentVC = viewController as? UIPageViewContentViewController else { return nil }
		let currentIndex = currentVC.index
		guard currentIndex > 0 else { return nil }
		return viewControllerAtIndex(currentIndex - 1)
	}

	// 返回后一个页面
	func pageViewController(_ pageViewController: UIPageViewController,
							viewControllerAfter viewController: UIViewController) -> UIViewController? {
		guard let currentVC = viewController as? UIPageViewContentViewController else { return nil }
		let currentIndex = currentVC.index
		guard currentIndex < totalPageCount - 1 else { return nil }
		return viewControllerAtIndex(currentIndex + 1)
	}

	// 页面指示器（圆点导航）
	func presentationCount(for pageViewController: UIPageViewController) -> Int {
		return totalPageCount
	}

	func presentationIndex(for pageViewController: UIPageViewController) -> Int {
		guard let currentVC = pageViewController.viewControllers?.first as? UIPageViewContentViewController else {
			return 0
		}
		return currentVC.index
	}
}
