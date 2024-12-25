//
//  Reactive.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/12/21.
//

import UIKit

// 副作用对象，记录副作用函数及其依赖
private class Effect {
	var action: () -> Void
	var dependencies: Set<AnyHashable> = []  // 用来存储依赖的状态
	var cleanup: (() -> Void)?  // 清理副作用的回调

	init(action: @escaping () -> Void, cleanup: (() -> Void)? = nil) {
		self.action = action
		self.cleanup = cleanup
	}

	// 执行副作用函数并重新收集依赖
	func run() {
		// 清空之前的依赖
		dependencies.forEach { dependency in
			guard let state = dependency as? any Watchable else {
				return
			}
			state.removeObserver(self)
		}
		dependencies.removeAll()
		// 执行副作用函数并收集依赖
		effectAction = self
		action()
		effectAction = nil
	}

	// 注册依赖
	func registerDependency(_ state: AnyHashable) {
		dependencies.insert(state)
	}

	// 销毁副作用
	func cleanupEffect() {
		cleanup?()
	}
}

extension Effect: Hashable {
	static func == (lhs: Effect, rhs: Effect) -> Bool {
		// 使用内存地址来判断相等性
		return lhs === rhs
	}

	func hash(into hasher: inout Hasher) {
		// 使用内存地址作为哈希值
		hasher.combine(ObjectIdentifier(self))
	}
}

// 全局变量，存储当前执行的副作用对象
private var effectAction: Effect? = nil

private protocol Watchable: AnyObject, Hashable {
	func removeObserver(_ effect: Effect)
}

extension Watchable {
	static func == (lhs: Self, rhs: Self) -> Bool {
		// 使用内存地址来判断相等性
		return lhs === rhs
	}

	func hash(into hasher: inout Hasher) {
		// 使用内存地址作为哈希值
		hasher.combine(ObjectIdentifier(self))
	}

}

// 定义类似 Vue 的响应式机制
@propertyWrapper
private class State<T: Hashable>: Watchable {
	private var value: T
	private var observers: Set<Effect> = []  // 存储 Effect 对象实例

	var wrappedValue: T {
		get {
			// 获取状态时，自动注册依赖
			observe()
			return value
		}
		set {
			value = newValue
			// 状态改变时触发依赖
			observers.forEach { $0.run() }
		}
	}

	init(wrappedValue: T) {
		self.value = wrappedValue
	}

	// 自动注册依赖
	private func observe() {
		// 如果当前有副作用对象，就将该状态添加为依赖
		if let action = effectAction {
			action.registerDependency(self)
		}
		// 还需要将当前副作用函数添加到状态的 observers 中
		if let action = effectAction {
			observers.insert(action)  // 将当前副作用对象添加到 observers 中
		}
	}

	// 清除所有副作用
	func removeAllObservers() {
		observers.forEach { $0.cleanupEffect() }
		observers.removeAll()
	}

	func removeObserver(_ effect: Effect) {
		observers.remove(effect)
	}
}

// 全局 effect 函数
private func effect(_ action: @escaping () -> Void) -> (() -> Void)? {
	let effectObj = Effect(
		action: action,
		cleanup: {
			// 清理副作用的回调，比如移除观察者
			print("Cleanup effect")
		})
	effectObj.run()

	return {  // 返回一个清理副作用的回收函数
		effectObj.cleanupEffect()
	}
}

private class ReactiveController: UIViewController {

	// 使用 State 来管理响应式状态
	@State var count: Int = 0
	@State var isEnabled: Bool = true

	let button: UIButton = .init(type: .system)
	var cleanupAction: (() -> Void)?

	override func viewDidLoad() {
		super.viewDidLoad()

		// 设置 UI
		button.frame = CGRect(x: 100, y: 100, width: 200, height: 50)
		button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
		view.addSubview(button)

		// 定义全局 effect，自动收集依赖
		cleanupAction = effect { [weak self] in
			guard let self else { return }
			if isEnabled {
				button.setTitle("Count: \(count)", for: .normal)
			} else {
				button.setTitle("Disabled", for: .normal)
			}
		}
	}

	// 点击按钮时更新 count
	@objc func buttonTapped() {
		count += 1
	}

	// 控制器销毁时清理副作用
	deinit {
		cleanupAction?()
		print("ViewController deinitialized")
	}
}
