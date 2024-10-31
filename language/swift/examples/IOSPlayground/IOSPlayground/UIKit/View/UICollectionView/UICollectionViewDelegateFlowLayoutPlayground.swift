//
//  Untitled.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit
import SnapKit

class UICollectionViewDelegateFlowLayoutPlayground: UIViewController, UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {
	
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
		
		title = "UICollectionViewDelegateFlowLayout"
		
		configureCollectionView()
		applyInitialData()
	}
	
	// 配置 CollectionView
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.dataSource = self
		collectionView.delegate = self
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

	// MARK: - UICollectionViewDataSource
	
	func numberOfSections(in collectionView: UICollectionView) -> Int {
		return Section.allCases.count
	}
	
	// 头大小
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> CGSize {
		let sectionType = Section(rawValue: section)
		switch sectionType {
		case .first:
			return CGSize(width: UIScreen.main.bounds.width, height: 60) // Adjust height for the first section header
		case .second:
			return CGSize(width: UIScreen.main.bounds.width, height: 40) // Adjust height for the second section header
		default:
			return CGSize(width: UIScreen.main.bounds.width, height: 50)
		}
	}
	
	// Section 内边距
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, insetForSectionAt section: Int) -> UIEdgeInsets {
		let sectionType = Section(rawValue: section)
		switch sectionType {
		case .first:
			return UIEdgeInsets(top: 100, left: 10, bottom: 30, right: 10)
		case .second:
			return UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
		default:
			return UIEdgeInsets.zero
		}
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
	
	// 行大小
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
		let sectionType = Section(rawValue: indexPath.section)
		switch sectionType {
		case .first:
			return CGSize(width: UIScreen.main.bounds.width - 30, height: 200)
		case .second:
			return CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		default:
			return CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		}
	}
	
	// 行间距
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumLineSpacingForSectionAt section: Int) -> CGFloat {
		let sectionType = Section(rawValue: section)
		switch sectionType {
		case .first:
			return 100
		case .second:
			return 50
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
