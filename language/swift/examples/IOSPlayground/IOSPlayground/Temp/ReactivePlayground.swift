//
//  Reactive.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/12/21.
//

import UIKit

// 副作用对象，记录副作用函数及其依赖
class ReactiveEffect {
	var action: () -> Void
	var disposes: [() -> Void] = []

	init(action: @escaping () -> Void) {
		self.action = action
	}

	// 执行副作用函数并重新收集依赖
	func run() {
		print(">> ReactiveEffect run: \(disposes.count)")
		// 清空之前的依赖
		disposes.forEach { dispose in
			dispose()
		}
		disposes = []
		// 执行副作用函数并收集依赖
		currentReactiveEffect = self
		action()
		currentReactiveEffect = nil
	}

	func registerDispose(_ dispose: @escaping () -> Void) {
		disposes.append(dispose)
	}

	func cleanup() {
		print(">> ReactiveEffect cleanup: \(disposes.count)")
		disposes.forEach { dispose in
			dispose()
		}
		disposes = []
	}

	deinit {
		print(">> ReactiveEffect deinit: \(disposes.count)")
	}
}

extension ReactiveEffect: Hashable {
	static func == (lhs: ReactiveEffect, rhs: ReactiveEffect) -> Bool {
		// 使用内存地址来判断相等性
		return lhs === rhs
	}

	func hash(into hasher: inout Hasher) {
		// 使用内存地址作为哈希值
		hasher.combine(ObjectIdentifier(self))
	}
}

// 全局变量，存储当前执行的副作用对象
private var currentReactiveEffect: ReactiveEffect? = nil

protocol ReactiveWatchable: AnyObject, Hashable {
	func removeObserver(_ effect: ReactiveEffect)
}

extension ReactiveWatchable {
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
class ReactiveState<T: Hashable>: ReactiveWatchable {
	private var value: T
	private var observers: Set<ReactiveEffect> = []  // 存储 Effect 对象实例

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
		//		if let action = effectAction {
		//			action.registerDependency(self)
		//		}
		// 还需要将当前副作用函数添加到状态的 observers 中
		if let action = currentReactiveEffect {
			let (inserted, _) = observers.insert(action)  // 将当前副作用对象添加到 observers 中
			if inserted {
				action.registerDispose { [weak self] in
					guard let self else { return }
					observers.remove(action)
				}
			}
		}
	}

	// 清除所有副作用
	func removeAllObservers() {
		observers.removeAll()
	}

	func removeObserver(_ effect: ReactiveEffect) {
		observers.remove(effect)
	}

	deinit {
		print(">> ReactiveState deinit: \(value), \(observers.count)")
	}
}

// 全局 effect 函数
func reactiveEffect(_ action: @escaping () -> Void) -> (() -> Void)? {
	let effectObj = ReactiveEffect(action: action)
	effectObj.run()

	return {  // 返回一个清理副作用的回收函数
		effectObj.cleanup()
	}
}

class ReactiveDisposer {
	var disposes: [() -> Void] = []

	func add(_ dispose: @escaping () -> Void) {
		disposes.append(dispose)
	}

	deinit {
		print(">> ReactiveDisposer deinit: \(disposes.count)")
		disposes.forEach { dispose in
			dispose()
		}
		disposes = []
	}
}

protocol ReactiveComponent {
	func effect(_ action: @escaping () -> Void)

	func build() -> ReactiveComponent?
}

private var reactiveDisposeKey: UInt8 = 0

extension ReactiveComponent {
	func addDispose(_ dispose: @escaping () -> Void) {
		var disponser = objc_getAssociatedObject(self, &reactiveDisposeKey) as? ReactiveDisposer
		if disponser == nil {
			disponser = .init()
			objc_setAssociatedObject(
				self, &reactiveDisposeKey, disponser, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
		}
		disponser?.add(dispose)
	}

	func effect(_ action: @escaping () -> Void) {
		if let dispose = reactiveEffect(action) {
			// 解决全局状态监听导致的副作用释放问题（辅助用函数需要跟着控制器或视图一起销毁）
			addDispose(dispose)
		}
	}

	func build() -> ReactiveComponent? {
		return nil
	}
}

@resultBuilder
struct ChildrenBuilder {
	static func buildBlock(_ components: Int...) -> [Int] {
		components
	}
}

extension UIView: ReactiveComponent {
	convenience init(
		style: ReactiveStyle? = nil,
		@ChildrenBuilder _ children: () -> [UIView]
	) {
		self.init(frame: .zero)
		let children = children()
		for child in children {
			addSubview(child)
		}
	}
}

class ReactiveStyle {
	func aplha(_ alpha: @autoclosure () -> Double? = nil) {
		
	}
}

extension UIViewController: ReactiveComponent {}

class ReactiveVM {
	static let instance: ReactiveVM = .init()

	@ReactiveState var count: Int = 0
}

class ReactivePlayground: UIViewController {

	// 使用 State 来管理响应式状态
	//	@ReactiveState var count: Int = 0
	@ReactiveState var isEnabled: Bool = true

	let button: UIButton = .init(type: .system)

	override func viewDidLoad() {
		super.viewDidLoad()

		// 设置 UI
		button.frame = CGRect(x: 100, y: 100, width: 200, height: 50)
		button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
		view.addSubview(button)

		// 定义全局 effect，自动收集依赖
		effect { [weak self] in
			guard let self else { return }
			if isEnabled {
				button.setTitle("Count: \(ReactiveVM.instance.count)", for: .normal)
			} else {
				button.setTitle("Disabled", for: .normal)
			}
		}
	}

	// 点击按钮时更新 count
	@objc func buttonTapped() {
		ReactiveVM.instance.count += 1
	}

	// 控制器销毁时清理副作用
	deinit {
		print(">> ViewController deinit")
	}
}
