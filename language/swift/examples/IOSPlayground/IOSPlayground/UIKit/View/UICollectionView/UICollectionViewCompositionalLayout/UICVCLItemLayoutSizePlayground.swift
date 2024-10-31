//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLItemLayoutSizePlayground: UIViewController {
	enum Section {
		case main
	}
	
	var dataSource: UICollectionViewDiffableDataSource<Section, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Item layoutSize"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLItemLayoutSizePlayground {
	private func createLayout() -> UICollectionViewLayout {
		let item1Width = CGFloat(0.5)
		let item3Width = CGFloat(60)
		
		let item1 = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				// 等于 Group 宽度的二分之一
				widthDimension: .fractionalWidth(item1Width),
				// 等于 Group 的高度值，如果 Group 是预估高度值，则会按预估高度值显示（不会按实际高度显示）
				heightDimension: .fractionalHeight(1.0)
			)
		)
		let item2 = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				// 固定显示一行的剩余宽度
				widthDimension: .absolute(view.bounds.width * item1Width - item3Width),
				// 固定高度 40pt
				heightDimension: .absolute(40)
			)
		)
		let item3 = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				// 预估宽度 50pt，显示是会按内容缩放显示，超出一行时会换行显示
				widthDimension: .estimated(item3Width),
				// 预估高度 40pt，内容可以撑开高度
				heightDimension: .estimated(40)
			)
		)
		let group = NSCollectionLayoutGroup.horizontal(
			layoutSize: NSCollectionLayoutSize(
				// 屏幕宽度
				widthDimension: .fractionalWidth(1.0),
				// 预估高度 40，item 可以撑开 Group 高度
				heightDimension: .estimated(40)
			),
			subitems: [item1, item2, item3]
		)
		let section = NSCollectionLayoutSection(group: group)
		let layout = UICollectionViewCompositionalLayout(section: section)
		return layout
	}
}

extension UICVCLItemLayoutSizePlayground {
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
			cell.contentView.backgroundColor = .systemBlue
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
		snapshot.appendSections([.main])
		snapshot.appendItems(Array(0..<111))
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
		label.numberOfLines = 0
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

