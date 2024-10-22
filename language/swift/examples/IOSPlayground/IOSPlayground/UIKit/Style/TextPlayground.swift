//
//  TextStylePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/21.
//

import Fakery
import Foundation
import SnapKit
import UIKit

class TextStylePlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	let faker = Faker(locale: "en")
	var demos: [(String,(_ label: UILabel) -> Void)] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Text"
		
		demos = [
			("设置文本",{ (label: UILabel) in
				label.text = self.faker.lorem.paragraphs(amount: 1)
			}),
			("文字大小",{ (label: UILabel) in
				label.text = self.faker.lorem.paragraphs(amount: 1)
				label.font = UIFont.boldSystemFont(ofSize: 18)
			}),
			("文字类型",{ (label: UILabel) in
				label.text = self.faker.lorem.paragraphs(amount: 1)
				if let customFont = UIFont(name: "Arial-BoldMT", size: 18) {
					label.font = customFont
				}
			}),
			("文本颜色", { (label: UILabel) in
				label.text = self.faker.lorem.paragraphs(amount: 1)
				label.textColor = UIColor.red
			}),
			("背景色", { (label: UILabel) in
				label.text = self.faker.lorem.paragraphs(amount: 1)
				label.backgroundColor = UIColor.yellow
			}),
			("阴影", { (label: UILabel) in
				label.text = self.faker.address.county()
				label.shadowColor = UIColor.gray
				label.shadowOffset = CGSize(width: 2, height: 2)
			}),
			("水平对齐方式", { (label: UILabel) in
				label.text = self.faker.name.name()
				label.textAlignment = .center
			}),
			("基线对齐方式 - baseline", { (label: UILabel) in
				label.text = self.faker.name.name()
				label.baselineAdjustment = .alignBaselines
			}),
			("基线对齐方式 - center", { (label: UILabel) in
				label.text = self.faker.name.name()
				label.baselineAdjustment = .alignCenters
			}),
			("换行模式：Word Wrap", { (label: UILabel) in
				label.numberOfLines = 0
				label.lineBreakMode = .byWordWrapping
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("换行模式：Truncating Tail", { (label: UILabel) in
				label.numberOfLines = 3
				label.lineBreakMode = .byTruncatingTail
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("换行模式：Truncating Middle", { (label: UILabel) in
				label.numberOfLines = 3
				label.lineBreakMode = .byTruncatingMiddle
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("换行模式：Truncating Head", { (label: UILabel) in
				label.numberOfLines = 3
				label.lineBreakMode = .byTruncatingHead
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("换行模式：Character Wrap", { (label: UILabel) in
				label.numberOfLines = 3
				label.lineBreakMode = .byCharWrapping
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("换行模式：Clipping", { (label: UILabel) in
				label.numberOfLines = 3
				label.lineBreakMode = .byClipping
				label.text = self.faker.lorem.paragraphs(amount: 3)
			}),
			("设置行间距", { (label: UILabel) in
				let paragraphStyle = NSMutableParagraphStyle()
				paragraphStyle.lineSpacing = 10
				let attributes: [NSAttributedString.Key: Any] = [.paragraphStyle: paragraphStyle]
				label.attributedText = NSAttributedString(string: self.faker.lorem.paragraphs(amount: 3), attributes: attributes)
			}),
		]
		
		tableView.register(TextStyleTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> TextStyleTableViewCell {
		// 为了避免样式冲突，这里选择不重用样式
		// let cell = tableView.dequeueReusableCell(withIdentifier: cellIdentifier, for: indexPath) as! TextStyleTableViewCell
		let cell = TextStyleTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
  
}

class TextStyleTableViewCell: UITableViewCell {
	let title: UILabel = {
		let label = UILabel()
		label.font = UIFont.boldSystemFont(ofSize: 16)
		label.translatesAutoresizingMaskIntoConstraints = false
		return label
	}()
	let content: UILabel = {
		let label = UILabel()
		label.numberOfLines = 0
		label.translatesAutoresizingMaskIntoConstraints = false
		return label
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
			content.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8)
		])
	}
	
	required init?(coder aDecoder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}
