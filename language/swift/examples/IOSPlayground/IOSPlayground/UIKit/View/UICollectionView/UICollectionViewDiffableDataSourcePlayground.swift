//
//  UICollectionViewPlayGround.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//
import SnapKit
import UIKit

/**
 * UICollectionViewDiffableDataSource
 * - 管理数据：初始化、新增、修改和删除
 * - 管理视图：Section、Cell
 */
class UICollectionViewDiffableDataSourcePlayground: UIViewController, UICollectionViewDelegate {
	
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
	
	class Item: NSObject {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
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
		collectionView.register(FirstCell.self, forCellWithReuseIdentifier: "FirstCell")
		collectionView.register(SecondCell.self, forCellWithReuseIdentifier: "SecondCell")
		collectionView.register(CustomHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")
		
		collectionView.delegate = self
		
		view.addSubview(collectionView)
	}
	
	// 配置数据源
	private func configureDataSource() {
		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			
			let section = Section.allCases[indexPath.section]
			
			switch section {
			case .first:
				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "FirstCell", for: indexPath) as? FirstCell
				cell?.label.text = item.title
				return cell ?? UICollectionViewCell()
				
			case .second:
				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SecondCell", for: indexPath) as? SecondCell
				cell?.label.text = item.title
				return cell ?? UICollectionViewCell()
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
		let itemsFirstSection = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		let itemsSecondSection = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }
		
		snapshot.appendItems(itemsFirstSection, toSection: .first)
		snapshot.appendItems(itemsSecondSection, toSection: .second)
		
		diffableDataSource.apply(snapshot, animatingDifferences: true)
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
		
		buttonStack.addArrangedSubview(insertButton)
		buttonStack.addArrangedSubview(deleteButton)
		buttonStack.addArrangedSubview(moveButton)
		buttonStack.addArrangedSubview(updateButton)
		
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
		let firstItems = snapshot.itemIdentifiers(inSection: Section.first)
		snapshot.deleteItems([firstItems[0]])
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 移动项
	@objc private func moveItem() {
		var snapshot = diffableDataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: Section.first)
		let firstItem = firstItems[0]
		let sencondItem = firstItems[1]
		snapshot.moveItem(firstItem, afterItem: sencondItem)
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 更新项
	@objc private func updateItem() {
		var snapshot = diffableDataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: Section.first)
		let firstItem = firstItems[0]
		firstItem.title = "1"
		snapshot.reloadItems([firstItem])
		diffableDataSource.apply(snapshot, animatingDifferences: true)
	}
	
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		let section = Section.allCases[indexPath.section]
		let selectedItem = diffableDataSource.itemIdentifier(for: indexPath)
		
		if let item = selectedItem {
			print("Selected item in \(section.title): \(item.title), ID: \(item.id)")
		}
	}
}

// 自定义第一种单元格
fileprivate class FirstCell: UICollectionViewCell {
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

// 自定义第二种单元格
fileprivate class SecondCell: UICollectionViewCell {
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.textColor = .white
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		contentView.backgroundColor = .red
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
