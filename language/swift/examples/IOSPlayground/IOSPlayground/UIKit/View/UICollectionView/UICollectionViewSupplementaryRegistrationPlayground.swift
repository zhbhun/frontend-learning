//
//  UICollectionViewPlayGround.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//
import SnapKit
import UIKit

class UICollectionViewSupplementaryRegistrationPlayground: UIViewController {
	enum Section: Int, CaseIterable {
		case first
		case second

		var title: String {
			switch self {
			case .first:
				return "First Section"
			case .second:
				return "Second Section"
			}
		}
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
		
		title = "SupplementaryRegistration"
		
		configureCollectionView()
		configureDataSource()
		applyInitialSnapshot()
	}
	
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		layout.headerReferenceSize = CGSize(width: UIScreen.main.bounds.width, height: 50)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		view.addSubview(collectionView)
	}

	private func configureDataSource() {
		// 使用 CellRegistration 配置单元格
		let firstCellRegistration = UICollectionView.CellRegistration<CustomCell, Item> { (cell, indexPath, item) in
			cell.label.text = item.title
			cell.contentView.backgroundColor = .red
		}
		
		let secondCellRegistration = UICollectionView.CellRegistration<CustomCell, Item> { (cell, indexPath, item) in
			cell.label.text = item.title
			cell.contentView.backgroundColor = .blue
		}

		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in

			let section = Section.allCases[indexPath.section]
			
			switch section {
			case .first:
				return collectionView.dequeueConfiguredReusableCell(using: firstCellRegistration, for: indexPath, item: item)
			case .second:
				return collectionView.dequeueConfiguredReusableCell(using: secondCellRegistration, for: indexPath, item: item)
			}
		}
		
		// 配置头部视图
		let headerRegistration = UICollectionView.SupplementaryRegistration<CustomHeader>(
			elementKind: UICollectionView.elementKindSectionHeader
		) { (headerView, elementKind, indexPath) in
			headerView.label.text = "Section \(indexPath.section)"
		}

		// 配置 section 头部视图
		diffableDataSource.supplementaryViewProvider = { (collectionView, kind, indexPath) in
			return collectionView.dequeueConfiguredReusableSupplementary(
				using: headerRegistration,
				for: indexPath
			)
			return nil
		}
	}

	// 应用初始快照
	private func applyInitialSnapshot() {
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.first, .second])
		
		// 创建并添加初始数据
		let firstItems = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		let secondItems = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }

		snapshot.appendItems(firstItems, toSection: .first)
		snapshot.appendItems(secondItems, toSection: .second)
		
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}
}

// 自定义单元格
fileprivate class CustomCell: UICollectionViewCell {
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.textColor = .white
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		contentView.backgroundColor = .blue
		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}
}

// 自定义头部视图
fileprivate class CustomHeader: UICollectionReusableView {
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.textColor = .black
		label.font = UIFont.boldSystemFont(ofSize: 20)
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		addSubview(label)
		label.snp.makeConstraints { make in
			make.edges.equalToSuperview().inset(10)
		}
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}
}
