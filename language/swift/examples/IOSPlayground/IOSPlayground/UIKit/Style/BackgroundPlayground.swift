//
//  BackgroundPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/21.
//

import Foundation
import SnapKit
import UIKit

class BackgroundPlayground: UITableViewController {
	
	let cellIdentifier = "cell"
	var demos: [(String,(_ label: UIView) -> Void)] = []
	var boundsObservations: [NSKeyValueObservation] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Background"
		
		demos = [
			("Color",{ (view: UIView) in
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
			("Image Layer by resizeAspect",{ (view: UIView) in
				if let image = UIImage(named: "Swift")?.cgImage {
					view.layer.contents = image
					view.layer.contentsGravity = .resizeAspect
					view.layer.masksToBounds = true
				}
			}),
			("Image Layer by resizeAspectFill",{ (view: UIView) in
				if let image = UIImage(named: "Swift")?.cgImage {
					view.layer.contents = image
					view.layer.contentsGravity = .resizeAspectFill
					view.layer.masksToBounds = true
				}
			}),
			("Image Layer by center",{ (view: UIView) in
				if let image = UIImage(named: "Swift")?.cgImage {
					view.layer.contents = image
					view.layer.contentsGravity = .center
					view.layer.masksToBounds = true
				}
			}),
			("Image Layer by resize",{ (view: UIView) in
				if let image = UIImage(named: "Swift")?.cgImage {
					view.layer.contents = image
					view.layer.contentsGravity = .resize
					view.layer.masksToBounds = true
				}
			}),
			("Image Layer by bottomRight",{ (view: UIView) in
				if let image = UIImage(named: "Swift")?.cgImage {
					view.layer.contents = image
					view.layer.contentsGravity = .bottomRight
					view.layer.masksToBounds = true
				}
			}),
			("Gradient",{ (view: UIView) in
				let gradientLayer = CAGradientLayer()
				// gradientLayer.frame = view.bounds  // 设置渐变层的大小与视图相同
				// gradientLayer.frame = CGRect(x: 0, y: 0, width: 100, height: 100)
				
				// 设置渐变的颜色数组，每个颜色是 CGColor
				gradientLayer.colors = [
					UIColor.red.cgColor,
					UIColor.blue.cgColor
				]
				
				// 设置渐变颜色的位置（0.0 是起点，1.0 是终点）
				gradientLayer.locations = [0.0, 1.0]  // 从红色到蓝色
				
				// 设置渐变方向（startPoint 和 endPoint 是 CGPoint，分别表示渐变的起点和终点）
				gradientLayer.startPoint = CGPoint(x: 0.0, y: 0.0)  // 左上角
				gradientLayer.endPoint = CGPoint(x: 1.0, y: 1.0)  // 右下角
				
				// 将渐变层添加到视图的 layer 中
				view.layer.insertSublayer(gradientLayer, at: 0)  // 将渐变层放在最底部
				
				self.boundsObservations.append(view.observe(\.bounds, options: [.new]) { [weak self] (view, change) in
					if self == nil {
						return
					}
					gradientLayer.frame = view.bounds
				})
			}),
		]
		
		tableView.register(BackgroundTableViewCell.self, forCellReuseIdentifier: cellIdentifier)
	}
	
	
	// MARK: - UITableViewDataSource
	
	override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
		return demos.count
	}
	
	override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> BackgroundTableViewCell {
		let cell = BackgroundTableViewCell(style: .default, reuseIdentifier: cellIdentifier)
		let (title, process) = demos[indexPath.row]
		cell.title.text = title
		process(cell.content)
		return cell
	}
	
}

class BackgroundTableViewCell: UITableViewCell {
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
