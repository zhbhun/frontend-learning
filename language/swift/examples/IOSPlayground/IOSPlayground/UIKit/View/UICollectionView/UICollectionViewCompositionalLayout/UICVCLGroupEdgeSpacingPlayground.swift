//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLGroupEdgeSpacingPlayground: UIViewController {
	enum Section {
		case main
	}
	
	var dataSource: UICollectionViewDiffableDataSource<Section, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Group edgeSpacing"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLGroupEdgeSpacingPlayground {
	private func createLayout() -> UICollectionViewLayout {
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
			subitems: [item]
		)
		// group 外边距，item fractional 按照 UICollectionView 的大小计算（不扣除外边距），可能会将 item 挤出屏幕外
		group.edgeSpacing = NSCollectionLayoutEdgeSpacing(
			leading: .fixed(50),
			top: .fixed(50),
			trailing: .flexible(50),
			bottom: .flexible(50)
		)
		let section = NSCollectionLayoutSection(group: group)
		let layout = UICollectionViewCompositionalLayout(section: section)
		return layout
	}
}

extension UICVCLGroupEdgeSpacingPlayground {
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
		snapshot.appendItems(Array(0..<94))
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

