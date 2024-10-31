//
//  Untitled.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit
import SnapKit

class UICollectionViewControllerPlayground: UIViewController, UICollectionViewDataSource {
	
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
	
	class Item {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
		}
	}
	
	var collectionView: UICollectionView! = nil
	var itemsFirstSection: [Item] = []
	var itemsSecondSection: [Item] = []
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewDataSource"
		
		configureCollectionView()
		applyInitialData()
		setupActionButtons()
	}
	
	// 配置 CollectionView
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		layout.headerReferenceSize = CGSize(width: UIScreen.main.bounds.width, height: 50)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.dataSource = self
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "FirstCell")
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "SecondCell")
		collectionView.register(CustomHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")
		
		view.addSubview(collectionView)
	}
	
	// 配置初始数据
	private func applyInitialData() {
		itemsFirstSection = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		itemsSecondSection = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }
		collectionView.reloadData()
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
		
		container.snp.makeConstraints { make in
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
		let newItem = Item(id: UUID(), title: "New Item")
		itemsFirstSection.insert(newItem, at: 0)
		collectionView.insertItems(at: [IndexPath(item: 0, section: Section.first.rawValue)])
	}
	
	// 删除项
	@objc private func deleteItem() {
		guard !itemsFirstSection.isEmpty else { return }
		itemsFirstSection.removeFirst()
		collectionView.deleteItems(at: [IndexPath(item: 0, section: Section.first.rawValue)])
	}
	
	// 移动项
	@objc private func moveItem() {
		guard itemsFirstSection.count > 1 else { return }
		let itemToMove = itemsFirstSection.removeFirst()
		itemsFirstSection.append(itemToMove)
		collectionView.moveItem(at: IndexPath(item: 0, section: Section.first.rawValue), to: IndexPath(item: itemsFirstSection.count - 1, section: Section.first.rawValue))
	}
	
	// 更新项
	@objc private func updateItem() {
		guard !itemsFirstSection.isEmpty else { return }
		itemsFirstSection[0].title = "Updated \(itemsFirstSection[0].title)"
		collectionView.reloadItems(at: [IndexPath(item: 0, section: Section.first.rawValue)])
	}
	
	// MARK: - UICollectionViewDataSource
	
	func numberOfSections(in collectionView: UICollectionView) -> Int {
		return Section.allCases.count
	}
	
	func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		let sectionType = Section(rawValue: section)
		switch sectionType {
		case .first:
			return itemsFirstSection.count
		case .second:
			return itemsSecondSection.count
		default:
			return 0
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let sectionType = Section(rawValue: indexPath.section)
		switch sectionType {
		case .first:
			let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "FirstCell", for: indexPath) as? CustomCell
			guard let cell = cell else {
				return UICollectionViewCell()
			}
			cell.label.text = itemsFirstSection[indexPath.item].title
			cell.contentView.backgroundColor = .blue
			return cell
		case .second:
			let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SecondCell", for: indexPath) as? CustomCell
			guard let cell = cell else {
				return UICollectionViewCell()
			}
			cell.label.text = itemsSecondSection[indexPath.item].title
			cell.contentView.backgroundColor = .red
			return cell
		default:
			return UICollectionViewCell()
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath) -> UICollectionReusableView {
		guard kind == UICollectionView.elementKindSectionHeader else { return UICollectionReusableView() }
		let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: "header", for: indexPath) as? CustomHeader
		guard let header = header else {
			return UICollectionReusableView()
		}
		header.label.text = Section.allCases[indexPath.section].title
		return header
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
