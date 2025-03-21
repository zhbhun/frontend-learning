//
//  FramePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/30.
//
import Foundation
import SnapKit
import UIKit

class FramePlayground: UIViewController {
	var demos: [Demo]!
	var demoListView: DemoListView!

	override func viewDidLoad() {
		view.backgroundColor = .white

		demos = [
			.init(
				title: "frame",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(300)
					}
					
					let subview1 = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview1.backgroundColor = .red
					view.addSubview(subview1)
					let label1 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label1.text = "1"
					label1.textColor = .white
					subview1.addSubview(label1)

					let subview2 = UIView(frame: CGRect(x: 110, y: 10, width: 100, height: 100))
					subview2.bounds = .init(x: 0, y: 0, width: 50, height: 50)
					subview2.backgroundColor = .blue
					view.addSubview(subview2)
					let label2 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label2.text = "2"
					label2.textColor = .white
					subview2.addSubview(label2)
					
					let subview3 = UIView(frame: CGRect(x: 210, y: 10, width: 100, height: 100))
					subview3.bounds = .init(x: 25, y: 25, width: 50, height: 50)
					subview3.backgroundColor = .green
					view.addSubview(subview3)
					let label3 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label3.text = "3"
					label3.textColor = .white
					subview3.addSubview(label3)
					
					let subview4 = UIView(frame: CGRect(x: 10, y: 110, width: 100, height: 100))
					subview4.anchorPoint = .init(x: 1, y: 1)
					subview4.bounds = .init(x: 0, y: 0, width: 50, height: 50)
					subview4.backgroundColor = .green
					view.addSubview(subview4)
					let label4 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label4.text = "4"
					label4.textColor = .white
					subview4.addSubview(label4)
					
					let subview5 = UIView(frame: CGRect(x: 110, y: 110, width: 100, height: 100))
					subview5.anchorPoint = .init(x: 0.5, y: 0.5)
					subview5.bounds = .init(x: 0, y: 0, width: 50, height: 50)
					subview5.backgroundColor = .red
					view.addSubview(subview5)
					let label5 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label5.text = "5"
					label5.textColor = .white
					subview5.addSubview(label5)
					
					let subview6 = UIView(frame: CGRect(x: 210, y: 110, width: 100, height: 100))
					subview6.anchorPoint = .init(x: 0, y: 0)
					subview6.bounds = .init(x: 0, y: 0, width: 50, height: 50)
					subview6.backgroundColor = .blue
					view.addSubview(subview6)
					let label6 = UILabel(frame: .init(x: 0, y: 0, width: 100, height: 30))
					label6.text = "6"
					label6.textColor = .white
					subview6.addSubview(label6)

					return view
				}
			),
			.init(
				title: "autoresizingMask",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(300)
					}
					
					let parentView = UIView(frame: CGRect(x: 50, y: 50, width: 100, height: 100))
					parentView.backgroundColor = .systemBlue
					view.addSubview(parentView)

					// 创建子视图并添加到父视图中
					let subview = UIView(frame: CGRect(x: 20, y: 20, width: 50, height: 50))
					subview.backgroundColor = .systemRed
					parentView.addSubview(subview)

					// 设置子视图的 autoresizingMask
					subview.autoresizingMask = [.flexibleWidth]
					// 设置宽高自适应，随着父视图变化自动调整大小

					// 添加按钮来触发父视图大小变化
					let toggleButton = UIButton(type: .system)
					toggleButton.setTitle("Toggle Size", for: .normal)
					toggleButton.addAction(
						UIAction { [weak parentView] _ in
							guard let parentView = parentView else { return }
							UIView.animate(withDuration: 0.5) {
								if parentView.frame.width == 100 {
									parentView.frame = CGRect(
										x: 50, y: 50, width: 200, height: 200)
								} else {
									parentView.frame = CGRect(
										x: 50, y: 50, width: 100, height: 100)
								}
							}
						}, for: .touchUpInside)
					toggleButton.frame = CGRect(x: 0, y: 0, width: 200, height: 50)
					view.addSubview(toggleButton)

					return view
				}
			)
		]

		demoListView = .init(demos)
		view.addSubview(demoListView)
		demoListView.snp.makeConstraints { make in
			make.edges.equalToSuperview()
		}
	}
}
