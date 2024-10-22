//
//  TransformPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/21.
//

import Foundation
import SnapKit
import UIKit

class TransformPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	var demos: [(String,(_ label: UIView) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Transform"
		
		demos = [
			("Scale 2x",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(scaleX: 2, y: 2)
				view.addSubview(imageView)
			}),
			("Scale 0.5x",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(scaleX: 0.5, y: 0.5)
				view.addSubview(imageView)
			}),
			("Rotation",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(rotationAngle: CGFloat.pi / 4)
				view.addSubview(imageView)
			}),
			("Rotation",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(rotationAngle: CGFloat.pi / 4)
				view.addSubview(imageView)
			}),
			("Translation",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(translationX: -25, y: -25)
				view.addSubview(imageView)
			}),
			("Compose",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = CGAffineTransform(scaleX: 0.5, y: 0.5).rotated(by: CGFloat.pi / 4)
				view.addSubview(imageView)
			}),
			("Reset",{ (view: UIView) in
				let image = UIImage(named: "Swift")
				let imageView = UIImageView(image: image)
				imageView.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
				imageView.transform = .identity
				view.addSubview(imageView)
			}),
		]
		
		tableView.register(TransformTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> TransformTableViewCell {
		let cell = TransformTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
	
}

class TransformTableViewCell: UITableViewCell {
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

