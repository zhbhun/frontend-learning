//
//  UIViewPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/20.
//

import Fakery
import Foundation
import UIKit

class UIViewPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	let faker = Faker(locale: "en")
	var demos: [(String,(_ label: UIView) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UIView"
		
		demos = [
			("Default",{ (view: UIView) in
			}),
			("Frame",{ (view: UIView) in
				let child = UIView(frame: CGRect(x: 100, y: 90, width: 50, height: 50))
				child.backgroundColor = UIColor(red: 1.0, green: 0, blue: 0, alpha: 1.0)
				view.addSubview(child)
				view.clipsToBounds = true
				DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: {
					var current: UIView = child
					print(">> 1 \(current.frame) \(current.bounds)")
					var frameInSuperView = current.convert(current.bounds, to: self.view.window)
					print(">> 2 \(frameInSuperView)")
				})
			}),
			("Bounds",{ (view: UIView) in
				let child = UIView(frame: CGRect(x: 25, y: 25, width: 50, height: 50))
				child.contentMode = .scaleToFill
				child.bounds = CGRect(x: -25, y: -25, width: 50, height: 50)
				child.backgroundColor = UIColor(red: 1.0, green: 0, blue: 0, alpha: 1.0)
				
				let label = UILabel(frame: CGRect(x: 0, y: 0, width: 50, height: 50))
				label.text = "Hello!"
				label.textColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
				label.backgroundColor = UIColor(red: 0.9, green: 0.9, blue: 0.9, alpha: 1.0)
				child.addSubview(label)
				view.addSubview(child)
			}),
		]
		
		tableView.register(ViewTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> ViewTableViewCell {
		// 为了避免样式冲突，这里选择不重用样式
		// let cell = tableView.dequeueReusableCell(withIdentifier: cellIdentifier, for: indexPath) as! TableViewCell
		let cell = ViewTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
  
}

class ViewTableViewCell: UITableViewCell {
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
			content.heightAnchor.constraint(equalToConstant: 100),
		])
	}
	
	required init?(coder aDecoder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}
