
//
//  UICollectionViewPlayGround.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//
import SnapKit
import UIKit

class UICollectionViewControllerPlayground: UICollectionViewController {
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
	
	var itemsFirstSection: [Item] = []
	var itemsSecondSection: [Item] = []
	
	init() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		layout.headerReferenceSize = CGSize(width: UIScreen.main.bounds.width, height: 50)
		
		super.init(collectionViewLayout: layout)
	}

	required init?(coder: NSCoder) {
		 fatalError("init(coder:) has not been implemented")
	 }

	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewController"
		
		configureCollectionView()
		applyInitialData()
	}
	
	// 配置 CollectionView
	private func configureCollectionView() {
		collectionView.backgroundColor = .systemBackground
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "FirstCell")
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "SecondCell")
		collectionView.register(CustomHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header")
	}
	
	// 配置初始数据
	private func applyInitialData() {
		itemsFirstSection = (1...10).map { Item(id: UUID(), title: "First Section Item \($0)") }
		itemsSecondSection = (1...10).map { Item(id: UUID(), title: "Second Section Item \($0)") }
		collectionView.reloadData()
	}

	// 有多少个 Section
	override func numberOfSections(in collectionView: UICollectionView) -> Int {
		return Section.allCases.count
	}
	
	// 每个 Section 有多少 Item
	override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
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
	
	// Item 构造
	override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
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
	
	// Section 头/尾构造
	override func collectionView(_ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath) -> UICollectionReusableView {
		guard kind == UICollectionView.elementKindSectionHeader else { return UICollectionReusableView() }
		let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: "header", for: indexPath) as? CustomHeader
		guard let header = header else {
			return UICollectionReusableView()
		}
		header.label.text = Section.allCases[indexPath.section].title
		return header
	}
}

// Custom cell
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

// Custom header view
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
