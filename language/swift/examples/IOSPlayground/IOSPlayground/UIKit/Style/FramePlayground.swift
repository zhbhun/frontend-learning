//
//  FramePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/30.
//
import Foundation
import SnapKit
import UIKit

class FramePlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	var demos: [(String,(_ label: UIView) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Frame"
		
		demos = [
			("autoresizingMask",{ (view: UIView) in
				let parentView = UIView(frame: CGRect(x: 50, y: 100, width: 200, height: 200))
				parentView.backgroundColor = .systemBlue
				view.addSubview(parentView)
				
				// 创建子视图并添加到父视图中
				let subview = UIView(frame: CGRect(x: 20, y: 20, width: 100, height: 100))
				subview.backgroundColor = .systemRed
				parentView.addSubview(subview)
				
				// 设置子视图的 autoresizingMask
				subview.autoresizingMask = [.flexibleWidth, .flexibleHeight]
				// 设置宽高自适应，随着父视图变化自动调整大小
				
				// 添加按钮来触发父视图大小变化
				let toggleButton = UIButton(type: .system)
				toggleButton.setTitle("Toggle Size", for: .normal)
				toggleButton.addAction(UIAction { [weak parentView] _ in
					guard let parentView = parentView else { return }
					UIView.animate(withDuration: 0.5) {
						if parentView.frame.width == 200 {
							parentView.frame = CGRect(x: 50, y: 100, width: 300, height: 300)
						} else {
							parentView.frame = CGRect(x: 50, y: 100, width: 200, height: 200)
						}
					}
				}, for: .touchUpInside)
				toggleButton.frame = CGRect(x: 0, y: 0, width: 200, height: 50)
				view.addSubview(toggleButton)
			}),
		]

		tableView.register(FrameTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> FrameTableViewCell {
		let cell = FrameTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
	
}

class FrameTableViewCell: UITableViewCell {
	let title: UILabel = {
		let label = UILabel()
		label.font = UIFont.boldSystemFont(ofSize: 16)
		label.translatesAutoresizingMaskIntoConstraints = false
		return label
	}()
	let content: UIView = {
		let view = UIView()
		view.backgroundColor = UIColor(red: 245.0/255.0, green: 245.0/255.0, blue: 245.0/255.0, alpha: 1.0)
		view.translatesAutoresizingMaskIntoConstraints = false
		return view
	}()
	
	override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
		super.init(style: style, reuseIdentifier: reuseIdentifier)
		contentView.addSubview(title)
		contentView.addSubview(content)
		NSLayoutConstraint.activate([
			title.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
			title.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
			title.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
			
			content.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 8),
			content.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
			content.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
			content.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),
			content.heightAnchor.constraint(equalToConstant: 400),
		])
	}
	
	required init?(coder aDecoder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}
