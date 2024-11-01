//
//  UICollectionViewDelegatePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//
import UIKit
import SnapKit

class UICollectionViewDelegatePlayground: UIViewController {
	enum Section: Int, CaseIterable {
		case main
	}

	class Item: Hashable {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
		}
		
		func hash(into hasher: inout Hasher) {
			hasher.combine(id)
		}
		
		static func == (lhs: Item, rhs: Item) -> Bool {
			return lhs.id == rhs.id
		}
	}

	var collectionView: UICollectionView! = nil
	var diffableDataSource: UICollectionViewDiffableDataSource<Section, Item>! = nil

	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewDelegate"
		
		configureCollectionView()
		configureDataSource()
		applyInitialSnapshot()
	}
	
	
}

extension UICollectionViewDelegatePlayground {
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.minimumLineSpacing = 10
		layout.minimumLineSpacing = 10
		layout.sectionInset = .init(top: 10, left: 15, bottom: 10, right: 15)
		layout.itemSize = CGSize(width: (UIScreen.main.bounds.width - 15 * 2 - 10 * 2) / 3, height: 100)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.delegate = self
		view.addSubview(collectionView)
	}

	private func configureDataSource() {
		// 使用 CellRegistration 配置单元格
		let cellRegistration = UICollectionView.CellRegistration<CustomCollectionViewCell, Item> { (cell, indexPath, item) in
			// cell.label.text = item.title
			// cell.contentView.backgroundColor = .red
		}
		
		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: item)
		}
	}

	// 应用初始快照
	private func applyInitialSnapshot() {
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.main])
		
		// 创建并添加初始数据
		snapshot.appendItems((1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }, toSection: .main)
		
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}
}

extension UICollectionViewDelegatePlayground: UICollectionViewDelegate {
	
	/// - Tag: highlight
	func collectionView(_ collectionView: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
		print(">> \(indexPath.row) \(indexPath.item) \((indexPath.item % 3) <= 1)")
		return (indexPath.item % 3) <= 1
	}
	
	func collectionView(_ collectionView: UICollectionView, didHighlightItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) {
			cell.contentView.backgroundColor = .blue
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, didUnhighlightItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) {
			cell.contentView.backgroundColor = .red
		}
	}
	
	/// - Tag: selection
	func collectionView(_ collectionView: UICollectionView, shouldSelectItemAt indexPath: IndexPath) -> Bool {
		return (indexPath.item % 3) == 0 || (indexPath.item % 3) == 2
	}
	
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) as? CustomCollectionViewCell {
			cell.showIcon()
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, didDeselectItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) as? CustomCollectionViewCell {
			cell.hideIcon()
		}
	}
}


fileprivate class CustomCollectionViewCell: UICollectionViewCell {
	var icon: UIImageView!
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		icon = UIImageView(image: UIImage(systemName: "play"))
		icon.alpha = 0.0
		contentView.addSubview(icon)
		icon.snp.makeConstraints { make in
			make.center.equalToSuperview()
			make.width.height.equalTo(24)
		}
		contentView.backgroundColor = .red
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}

	func showIcon() {
		icon.alpha = 1.0
	}
	
	func hideIcon() {
		icon.alpha = 0.0
	}
}
