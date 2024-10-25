//
//  List.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//


import SnapKit
import UIKit

typealias ListItemType = (String, UIViewController.Type)

class ListViewController: UICollectionViewController {
	
	var controllers: [ListItemType] = []
	
	init(controllers: [ListItemType]) {
		self.controllers = controllers
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 50)
		layout.minimumLineSpacing = 0
		super.init(collectionViewLayout: layout)
	}
	
	init() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 50)
		layout.minimumLineSpacing = 0
		super.init(collectionViewLayout: layout)
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Playground"
		
		collectionView.register(ListItem.self, forCellWithReuseIdentifier: "cell")
		collectionView.backgroundColor = UIColor(red: 245.0 / 255.0, green: 245.0 / 255.0, blue: 245.0 / 255.0, alpha: 1)
	}
	
	override func numberOfSections(in collectionView: UICollectionView) -> Int {
		return 1
	}
	
	override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return controllers.count
	}
	
	override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "cell", for: indexPath) as? ListItem
		var text = controllers[indexPath.row].0
		cell?.configure(with: text, isFirst: indexPath.row == 0, isLast: indexPath.row == controllers.count - 1)
		return cell ?? UICollectionViewCell()
	}
	
	override func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		collectionView.deselectItem(at: indexPath, animated: true)
		let controllerClass: UIViewController.Type = controllers[indexPath.row].1
		let viewController = controllerClass.init()
		navigationController?.pushViewController(viewController, animated: true)
	}
}

fileprivate class SectionItem: UICollectionReusableView {
	
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .left
		label.font = UIFont.boldSystemFont(ofSize: 18)
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		setupViews()
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
		setupViews()
	}
	
	private func setupViews() {
		addSubview(label)
		
		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}
	}
	
	func configure(with text: String) {
		label.text = text
	}
}

fileprivate class ListItem: UICollectionViewCell {
	
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .left
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		setupViews()
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
		setupViews()
	}
	
	private func setupViews() {
		contentView.addSubview(label)
		
		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}
		
		contentView.backgroundColor = .white
		contentView.clipsToBounds = true
	}
	
	func configure(with text: String, isFirst: Bool, isLast: Bool) {
		label.text = text
		contentView.layer.cornerRadius = 0
		if (isFirst) {
			contentView.layer.cornerRadius = 10
			contentView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
		} else if (isLast) {
			contentView.layer.cornerRadius = 10
			contentView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
		} else if (isFirst && isLast) {
			contentView.layer.cornerRadius = 10
		}
	}
}
