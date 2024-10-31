//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLGroupSubItemsPlayground: UIViewController {
	enum Section: Int, CaseIterable {
		case One
		case Two
		case Three
	}
	
	var dataSource: UICollectionViewDiffableDataSource<Section, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Group Subitems"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLGroupSubItemsPlayground {
	private func createLayout() -> UICollectionViewLayout {
		let layout = UICollectionViewCompositionalLayout { (sectionIndex: Int, layoutEnvironment: NSCollectionLayoutEnvironment) -> NSCollectionLayoutSection? in
			guard let section = Section(rawValue: sectionIndex) else { return nil }
			switch section {
			case Section.One:
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.2),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.2)
					),
					/**
					 * Group 代表每一行或每一列
					 *
					 * - 每一行或一列会按 subitems 里 item 顺序设置对应大小
					 * - 一行或或一列有剩余空间时，会按 subitems 里 item 顺序重新开始排列，直到一行放不下为止
					 * - 如果当前 subitems 还没有排完，但是一行或一列不够放了，会换行从头开始按 subitems 里的 item 顺序设置对应大小
					 */
					subitems: [item]
				)

				let section = NSCollectionLayoutSection(group: group)
				return section
			case Section.Two:
				let item1 = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.25),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let item2 = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.5),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.2)
					),
					// 规则同上
					subitems: [item1, item2]
				)
				let section = NSCollectionLayoutSection(group: group)
				return section
			case Section.Three:
			   let item = NSCollectionLayoutItem(
				   layoutSize: NSCollectionLayoutSize(
					   widthDimension: .fractionalWidth(0.4),
					   heightDimension: .fractionalHeight(1.0)
				   )
			   )
			   let group = NSCollectionLayoutGroup.horizontal(
				   layoutSize: NSCollectionLayoutSize(
					   widthDimension: .fractionalWidth(1.0),
					   heightDimension: .fractionalWidth(0.2)
				   ),
				   // 每一行严格按 subitem 的数量排列显示，超出一行则溢出屏幕显示（可以配置滚动显示）
				   repeatingSubitem: item,
				   count: 3
			   )
			   let section = NSCollectionLayoutSection(group: group)
			   return section
		   }
		}
		return layout
	}
}

extension UICVCLGroupSubItemsPlayground {
	private func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .white
		view.addSubview(collectionView)
	}
	
	private func configureDataSource() {
		let cellRegistration = UICollectionView.CellRegistration<TextCell, Int> { (cell, indexPath, identifier) in
			// Populate the cell with our item description.
			cell.label.text = "\(identifier)"
			var color: UIColor = .systemBlue
			if let section = Section(rawValue: indexPath.section) {
				switch section {
				case Section.One:
					color = .systemBlue
				case Section.Two:
					color = .systemRed
				case Section.Three:
					color = .systemGreen
				}
			}
			cell.contentView.backgroundColor = color
			cell.layer.borderColor = UIColor.black.cgColor
			cell.layer.borderWidth = 1
			cell.label.textAlignment = .center
			cell.label.font = UIFont.preferredFont(forTextStyle: .title1)
		}
		
		dataSource = UICollectionViewDiffableDataSource<Section, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			// Return the cell.
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		// initial data
		var snapshot = NSDiffableDataSourceSnapshot<Section, Int>()
		snapshot.appendSections([.One])
		snapshot.appendItems(Array(0..<10))
		snapshot.appendSections([.Two])
		snapshot.appendItems(Array(10..<20))
		snapshot.appendSections([.Three])
		snapshot.appendItems(Array(20..<30))
		dataSource.apply(snapshot, animatingDifferences: false)
	}
}

fileprivate class TextCell: UICollectionViewCell {
	let label = UILabel()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}

	required init?(coder: NSCoder) {
		fatalError("not implemnted")
	}
}

extension TextCell {
	func configure() {
		label.translatesAutoresizingMaskIntoConstraints = false
		label.adjustsFontForContentSizeCategory = true
		label.font = UIFont.preferredFont(forTextStyle: .caption1)
		label.textColor = .white
		contentView.addSubview(label)
		let inset = CGFloat(10)
		NSLayoutConstraint.activate([
			label.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: inset),
			label.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -inset),
			label.topAnchor.constraint(equalTo: contentView.topAnchor, constant: inset),
			label.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -inset)
		])
	}
}

