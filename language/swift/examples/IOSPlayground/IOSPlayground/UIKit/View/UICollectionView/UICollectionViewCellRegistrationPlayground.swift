//
//  UICollectionViewPlayGround.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//
import SnapKit
import UIKit

/**
 * UICollectionView.CellRegistration
 * 1. 简化单元格配置：通过 CellRegistration，开发者可以在创建单元格的同时定义其外观和内容。这样可以减少在 cellForItemAt 方法中重复配置单元格的代码。
 * 2. 支持类型安全：CellRegistration 使用泛型来指定单元格的类型和数据类型。这使得单元格的配置更加类型安全，不会因为错误的类型转换导致运行时错误。
 * 3. 注册和配置的统一：使用传统的 UICollectionView 时，需要先注册单元格，然后在 cellForItemAt 中配置。但使用 CellRegistration，注册和配置合并在一起，开发者可以直接在数据源中配置单元格。
 */
class UICollectionViewCellRegistrationPlayground: UIViewController {
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

	struct Item: Identifiable {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
		}
	}

	var items: [UUID : Item]!
	var collectionView: UICollectionView! = nil
	var diffableDataSource: UICollectionViewDiffableDataSource<Section, Item.ID>! = nil

	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionView CellRegistration"
		
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
		collectionView.register(CustomHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")
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

		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item.ID>(collectionView: collectionView) {
			(collectionView, indexPath, itemID) -> UICollectionViewCell? in
			
			guard let item = self.items[itemID] else { return nil }
			let section = Section.allCases[indexPath.section]
			
			switch section {
			case .first:
				return collectionView.dequeueConfiguredReusableCell(using: firstCellRegistration, for: indexPath, item: item)
			case .second:
				return collectionView.dequeueConfiguredReusableCell(using: secondCellRegistration, for: indexPath, item: item)
			}
		}

		// 配置 section 头部视图
		diffableDataSource.supplementaryViewProvider = { (collectionView, kind, indexPath) in
			guard kind == UICollectionView.elementKindSectionHeader else { return nil }
			let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: "header", for: indexPath) as? CustomHeader
			header?.label.text = Section.allCases[indexPath.section].title
			return header
		}
	}

	// 应用初始快照
	private func applyInitialSnapshot() {
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item.ID>()
		snapshot.appendSections([.first, .second])
		
		// 创建并添加初始数据
		let firstItems = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		let secondItems = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }
		
		// 将初始数据添加到字典中
		items = [:]
		firstItems.forEach { items[$0.id] = $0 }
		secondItems.forEach { items[$0.id] = $0 }
		
		let firstItemIds = firstItems.map { $0.id }
		let secondItemIds = secondItems.map { $0.id }
		
		snapshot.appendItems(firstItemIds, toSection: .first)
		snapshot.appendItems(secondItemIds, toSection: .second)
		
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
