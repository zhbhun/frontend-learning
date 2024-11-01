//
//  UICollectionViewDelegatePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//
import UIKit
import SnapKit

class UICollectionViewCellPlayground: UIViewController {
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

		title = "UICollectionViewCell"

		configureCollectionView()
		configureDataSource()
		applyInitialSnapshot()
	}
	
	
}

extension UICollectionViewCellPlayground {
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.minimumLineSpacing = 10
		layout.minimumLineSpacing = 10
		layout.sectionInset = .init(top: 10, left: 15, bottom: 10, right: 15)
		layout.itemSize = CGSize(width: (UIScreen.main.bounds.width - 15 * 2 - 10 * 2) / 3, height: 100)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
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
		snapshot.appendItems((1...10).map { Item(id: UUID(), title: "\($0)") }, toSection: .main)
		
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}
}

fileprivate class CustomCollectionViewCell: UICollectionViewCell {
	var icon: UIImageView!
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		let bv = UIView()
		bv.backgroundColor = .red
		backgroundView = bv
		
		let sbv = UIView()
		sbv.backgroundColor = .blue
		selectedBackgroundView = sbv
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}
}
