//
//  UIImagePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/17.
//

//
//  UILabelController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/29.
//

import Fakery
import Foundation
import UIKit

class UIImageViewPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	let faker = Faker(locale: "en")
	var demos: [(String,(_ label: UIImageView) -> Void)] = []
	
	var boundsObservation: NSKeyValueObservation?
	
	deinit {
		boundsObservation = nil
	}
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UIImageView"
		
		demos = [
			("Default",{ (imageView: UIImageView) in
			}),
			("contentMode = .center",{ (imageView: UIImageView) in
				imageView.contentMode = .center
			}),
			("contentMode = .scaleAspectFit",{ (imageView: UIImageView) in
				imageView.contentMode = .scaleAspectFit
			}),
			("contentMode = .scaleAspectFill",{ (imageView: UIImageView) in
				imageView.contentMode = .scaleAspectFill
			}),
			("contentMode = .scaleToFill",{ (imageView: UIImageView) in
				imageView.contentMode = .scaleToFill
			}),
			("contentMode = .bottom",{ (imageView: UIImageView) in
				imageView.contentMode = .bottom
			}),
			("contentMode = .bottomLeft",{ (imageView: UIImageView) in
				imageView.contentMode = .bottomLeft
			}),
			("contentMode = .bottomRight",{ (imageView: UIImageView) in
				imageView.contentMode = .bottomRight
			}),
			("contentMode = .left",{ (imageView: UIImageView) in
				imageView.contentMode = .left
			}),
			("contentMode = .right",{ (imageView: UIImageView) in
				imageView.contentMode = .right
			}),
			("contentMode = .top",{ (imageView: UIImageView) in
				imageView.contentMode = .top
			}),
			("contentMode = .topLeft",{ (imageView: UIImageView) in
				imageView.contentMode = .topLeft
			}),
			("contentMode = .topRight",{ (imageView: UIImageView) in
				imageView.contentMode = .topRight
			}),
		]
		
		tableView.register(ImageTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> ImageTableViewCell {
		let cell = ImageTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
}

class ImageTableViewCell: UITableViewCell {
	let title: UILabel = {
		let label = UILabel()
		label.font = UIFont.boldSystemFont(ofSize: 16)
		label.translatesAutoresizingMaskIntoConstraints = false
		return label
	}()
	let content: UIImageView = {
		let image = UIImage(named: "Swift")
		let imageView = UIImageView(image: image)
		imageView.translatesAutoresizingMaskIntoConstraints = false
		imageView.clipsToBounds = true
		return imageView
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
