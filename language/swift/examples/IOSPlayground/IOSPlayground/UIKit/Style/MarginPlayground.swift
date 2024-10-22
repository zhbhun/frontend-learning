//
//  MarginPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/21.
//

import Foundation
import SnapKit
import UIKit

class MarginPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	var demos: [(String,(_ label: UIView) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Margin"
		
		demos = [
			("Default",{ (view: UIView) in
				view.layoutMargins = UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
				let child = UIView()
				child.backgroundColor = .blue
				view.addSubview(child)
				child.snp.makeConstraints{ make in
					make.leading.equalTo(view.layoutMarginsGuide.snp.leading)
					make.top.equalTo(view.layoutMarginsGuide.snp.top)
					make.trailing.equalTo(view.layoutMarginsGuide.snp.trailing)
					make.bottom.equalTo(view.layoutMarginsGuide.snp.bottom)
				}
			}),
		]
		
		tableView.register(MarginTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> MarginTableViewCell {
		let cell = MarginTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
	
}

class MarginTableViewCell: UITableViewCell {
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
