//
//  UICollectionViewPlayGround.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//
import SnapKit
import UIKit

/**
 * UICollectionViewDiffableDataSource 引入了快照机制，通过增量更新来简化数据管理，提供更高效的动画更新支持，尤其适合需要频繁变更数据的场景。
 * - 管理数据：初始化、新增、修改和删除
 * - 管理视图：Section、Cell
 */
class UICollectionViewDiffableDataSourcePlayground: UIViewController {
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
		
		title = "UICollectionViewDiffableDataSource"
		
		// 设置 CollectionView
		configureCollectionView()
		// 配置数据源
		configureDataSource()
		// 应用初始数据
		applyInitialSnapshot()
		// 添加操作按钮
		setupActionButtons()
	}
	
	// 配置 CollectionView
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		layout.headerReferenceSize = CGSize(width: UIScreen.main.bounds.width, height: 50)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "FirstCell")
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "SecondCell")
		collectionView.register(CustomHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")

		view.addSubview(collectionView)
	}
	
	// 配置数据源
	private func configureDataSource() {
		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			
			let section = Section.allCases[indexPath.section]
			
			switch section {
			case .first:
				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "FirstCell", for: indexPath) as? CustomCell
				guard let cell = cell else { return UICollectionViewCell() }
				cell.label.text = item.title
				cell.contentView.backgroundColor = .red
				return cell
				
			case .second:
				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SecondCell", for: indexPath) as? CustomCell
				guard let cell = cell else { return UICollectionViewCell() }
				cell.label.text = item.title
				cell.contentView.backgroundColor = .blue
				return cell
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
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.first, .second])
		
		// 创建并添加初始数据
		let firstItems = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		let secondItems = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }

		snapshot.appendItems(firstItems, toSection: .first)
		snapshot.appendItems(secondItems, toSection: .second)
		
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}
	
	// 设置操作按钮
	private func setupActionButtons() {
		let buttonStack = UIStackView()
		buttonStack.axis = .horizontal
		buttonStack.spacing = 10
		buttonStack.distribution = .fillEqually

		let insertButton = UIButton(type: .system)
		insertButton.setTitle("Insert", for: .normal)
		insertButton.addTarget(self, action: #selector(insertItem), for: .touchUpInside)

		let deleteButton = UIButton(type: .system)
		deleteButton.setTitle("Delete", for: .normal)
		deleteButton.addTarget(self, action: #selector(deleteItem), for: .touchUpInside)

		let moveButton = UIButton(type: .system)
		moveButton.setTitle("Move", for: .normal)
		moveButton.addTarget(self, action: #selector(moveItem), for: .touchUpInside)

		let updateButton = UIButton(type: .system)
		updateButton.setTitle("Update", for: .normal)
		updateButton.addTarget(self, action: #selector(updateItem), for: .touchUpInside)

		let batchUpdateButton = UIButton(type: .system)
		batchUpdateButton.setTitle("Batch", for: .normal)
		batchUpdateButton.addTarget(self, action: #selector(batchUpdateItem), for: .touchUpInside)

		buttonStack.addArrangedSubview(insertButton)
		buttonStack.addArrangedSubview(deleteButton)
		buttonStack.addArrangedSubview(moveButton)
		buttonStack.addArrangedSubview(updateButton)
		buttonStack.addArrangedSubview(batchUpdateButton)

		let container = UIView()
		container.backgroundColor = .white
		container.addSubview(buttonStack)
		view.addSubview(container)
		
		container.snp.makeConstraints{ make in
			make.bottom.equalToSuperview()
			make.leading.equalToSuperview()
			make.trailing.equalToSuperview()
		}
		
		buttonStack.snp.makeConstraints { make in
			make.top.equalToSuperview().offset(10)
			make.bottom.equalToSuperview().offset(-34)
			make.leading.equalToSuperview().offset(15)
			make.trailing.equalToSuperview().offset(-15)
		}
	}
	
	// 插入新项
	@objc private func insertItem() {
		var snapshot = diffableDataSource.snapshot()
		let newItem = Item(id: UUID(), title: "New Item")
		snapshot.appendItems([newItem], toSection: .first)
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 删除项
	@objc private func deleteItem() {
		var snapshot = diffableDataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: .first).first else { return }
		snapshot.deleteItems([firstItem])
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 移动项
	@objc private func moveItem() {
		var snapshot = diffableDataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: .first)
		guard firstItems.count > 1 else { return }
		let firstItem = firstItems[0]
		let secondItem = firstItems[1]
		snapshot.moveItem(firstItem, afterItem: secondItem)
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 更新项
	@objc private func updateItem() {
		var snapshot = diffableDataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: .first).first else { return }
		let newItem = Item(
			id: firstItem.id,
			title: "1"
		)
		firstItem.title = "1"
		snapshot.reloadItems([firstItem])
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}

	// 批量更新
	@objc private func batchUpdateItem() {
		var snapshot = diffableDataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: .first)
		
		// 移动
		guard firstItems.count > 1 else { return }
		let firstItem = firstItems[0]
		let secondItem = firstItems[1]
		snapshot.moveItem(firstItem, afterItem: secondItem)
		
		// 删除
		guard firstItems.count > 2 else { return }
		let thirdItem = firstItems[2]
		snapshot.deleteItems([thirdItem])

		diffableDataSource.apply(snapshot, animatingDifferences: true)
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
