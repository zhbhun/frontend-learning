//
//  OpacityPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/21.
//

import Foundation
import SnapKit
import UIKit

class OpacityPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	var demos: [(String,(_ label: UIView) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Opacity"
		
		demos = [
			("Default",{ (view: UIView) in
				let label = UILabel(frame: CGRect(x: 0, y: 0, width: 50, height: 50))
				label.text = "Hello!"
				label.textColor = UIColor(red: 1.0, green: 0.0, blue: 0.0, alpha: 1.0)
				view.addSubview(label)
				view.alpha = 0.5
			}),
		]
		
		tableView.register(OpacityTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> OpacityTableViewCell {
		let cell = OpacityTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
	
}

class OpacityTableViewCell: UITableViewCell {
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
