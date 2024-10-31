//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLItemSupplementaryItemsPlayground: UIViewController {
	static let badgeElementKind = "badge-element-kind"
	
	enum Section {
		case main
	}
	
	var dataSource: UICollectionViewDiffableDataSource<Section, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Item contentInsets"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLItemSupplementaryItemsPlayground {
	private func createLayout() -> UICollectionViewLayout {
		let badge = NSCollectionLayoutSupplementaryItem(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .absolute(20),
				heightDimension: .absolute(20)
			),
			elementKind: UICVCLItemSupplementaryItemsPlayground.badgeElementKind,
			containerAnchor: NSCollectionLayoutAnchor(
				edges: [.top, .trailing],
				fractionalOffset: CGPoint(x: 0.3, y: -0.3)
			)
		)

		let item = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(0.25),
				heightDimension: .fractionalHeight(1.0)
			),
			supplementaryItems: [badge]
		)
		item.contentInsets = NSDirectionalEdgeInsets(
			top: 5,
			leading: 5,
			bottom: 5,
			trailing: 5
		)
		let group = NSCollectionLayoutGroup.horizontal(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1.0),
				heightDimension: .fractionalWidth(0.2)
			),
			subitems: [item]
		)
		let section = NSCollectionLayoutSection(group: group)
		let layout = UICollectionViewCompositionalLayout(section: section)
		return layout
	}
}

extension UICVCLItemSupplementaryItemsPlayground {
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
		
		let supplementaryRegistration = UICollectionView.SupplementaryRegistration
		<BadgeSupplementaryView>(elementKind: UICVCLItemSupplementaryItemsPlayground.badgeElementKind) {
			(badgeView, string, indexPath) in
			guard let value = self.dataSource.itemIdentifier(for: indexPath) else { return }
			let hasBadgeCount = value % 2 == 0
			// Set the badge count as its label (and hide the view if the badge count is zero).
			badgeView.label.text = "\(value % 10)"
			badgeView.isHidden = !hasBadgeCount
		}
		
		dataSource = UICollectionViewDiffableDataSource<Section, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			// Return the cell.
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		dataSource.supplementaryViewProvider = {
			return self.collectionView.dequeueConfiguredReusableSupplementary(using: supplementaryRegistration, for: $2)
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


fileprivate class BadgeSupplementaryView: UICollectionReusableView {

	static let reuseIdentifier = "badge-reuse-identifier"
	let label = UILabel()

	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}

	override var frame: CGRect {
		didSet {
			configureBorder()
		}
	}
	override var bounds: CGRect {
		didSet {
			configureBorder()
		}
	}

	required init?(coder: NSCoder) {
		fatalError("Not implemented")
	}
}

extension BadgeSupplementaryView {
	func configure() {
		label.translatesAutoresizingMaskIntoConstraints = false
		label.adjustsFontForContentSizeCategory = true
		addSubview(label)
		NSLayoutConstraint.activate([
			label.centerXAnchor.constraint(equalTo: centerXAnchor),
			label.centerYAnchor.constraint(equalTo: centerYAnchor)
			])
		label.font = UIFont.preferredFont(forTextStyle: .body)
		label.textAlignment = .center
		label.textColor = .black
		backgroundColor = .green
		configureBorder()
	}
	func configureBorder() {
		let radius = bounds.width / 2.0
		layer.cornerRadius = radius
		layer.borderColor = UIColor.black.cgColor
		layer.borderWidth = 1.0
	}
}
