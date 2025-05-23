//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLSectionPinnedBoundarySupplementaryItemsPlayground: UIViewController {
	
	static let sectionHeaderElementKind = "Section header element kind"
	static let sectionFooterElementKind = "Sctionfooter element kind"
	
	var dataSource: UICollectionViewDiffableDataSource<Int, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Section pinned boundarySupplementaryItems"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLSectionPinnedBoundarySupplementaryItemsPlayground {
	/// - Tag: HeaderFooter
	func createLayout() -> UICollectionViewLayout {
		let item = NSCollectionLayoutItem(layoutSize: NSCollectionLayoutSize(
			widthDimension: .fractionalWidth(1.0),
			heightDimension: .fractionalHeight(1.0)
		))
		
		let group = NSCollectionLayoutGroup.horizontal(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1.0),
				heightDimension: .absolute(44)
			),
			subitems: [item]
		)
		
		let section = NSCollectionLayoutSection(group: group)
		section.interGroupSpacing = 5
		section.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 10, bottom: 0, trailing: 10)
		let headerFooterSize = NSCollectionLayoutSize(
			widthDimension: .fractionalWidth(1.0),
			// 预估高度可能被实际内容撑开
			heightDimension: .estimated(44)
		)
		let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
			layoutSize: headerFooterSize,
			elementKind: UICVCLSectionBoundarySupplementaryItemsPlayground.sectionHeaderElementKind,
			alignment: .top
		)
		let sectionFooter = NSCollectionLayoutBoundarySupplementaryItem(
			layoutSize: headerFooterSize,
			elementKind: UICVCLSectionBoundarySupplementaryItemsPlayground.sectionFooterElementKind,
			alignment: .bottom
		)
		sectionHeader.pinToVisibleBounds = true
		sectionHeader.zIndex = 2
		section.boundarySupplementaryItems = [sectionHeader, sectionFooter]
		
		let layout = UICollectionViewCompositionalLayout(section: section)
		return layout
	}
}

extension UICVCLSectionPinnedBoundarySupplementaryItemsPlayground {
	func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .systemBackground
		view.addSubview(collectionView)
		collectionView.delegate = self
	}

	func configureDataSource() {
		
		let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, Int> { (cell, indexPath, identifier) in
			var content = cell.defaultContentConfiguration()
			content.text = "\(indexPath.section),\(indexPath.item)"
			cell.contentConfiguration = content
		}
		
		let headerRegistration = UICollectionView.SupplementaryRegistration
		<TitleSupplementaryView>(elementKind: UICVCLSectionBoundarySupplementaryItemsPlayground.sectionHeaderElementKind) {
			(supplementaryView, string, indexPath) in
			supplementaryView.label.text = "\(string) for section \(indexPath.section)"
			supplementaryView.backgroundColor = .lightGray
			supplementaryView.layer.borderColor = UIColor.black.cgColor
			supplementaryView.layer.borderWidth = 1.0
		}
		
		let footerRegistration = UICollectionView.SupplementaryRegistration
		<TitleSupplementaryView>(elementKind: UICVCLSectionBoundarySupplementaryItemsPlayground.sectionFooterElementKind) {
			(supplementaryView, string, indexPath) in
			supplementaryView.label.text = "\(string) for section \(indexPath.section)"
			supplementaryView.backgroundColor = .lightGray
			supplementaryView.layer.borderColor = UIColor.black.cgColor
			supplementaryView.layer.borderWidth = 1.0
		}
		
		dataSource = UICollectionViewDiffableDataSource<Int, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		dataSource.supplementaryViewProvider = { (view, kind, index) in
			return self.collectionView.dequeueConfiguredReusableSupplementary(
				using: kind == UICVCLSectionBoundarySupplementaryItemsPlayground.sectionHeaderElementKind ? headerRegistration : footerRegistration, for: index)
		}
		
		// initial data
		let itemsPerSection = 5
		let sections = Array(0..<5)
		var snapshot = NSDiffableDataSourceSnapshot<Int, Int>()
		var itemOffset = 0
		sections.forEach {
			snapshot.appendSections([$0])
			snapshot.appendItems(Array(itemOffset..<itemOffset + itemsPerSection))
			itemOffset += itemsPerSection
		}
		dataSource.apply(snapshot, animatingDifferences: false)
	}
}

extension UICVCLSectionPinnedBoundarySupplementaryItemsPlayground: UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		collectionView.deselectItem(at: indexPath, animated: true)
	}
}

fileprivate class TitleSupplementaryView: UICollectionReusableView {
	let label = UILabel()
	static let reuseIdentifier = "title-supplementary-reuse-identifier"
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}
	required init?(coder: NSCoder) {
		fatalError()
	}
}

extension TitleSupplementaryView {
	func configure() {
		addSubview(label)
		label.numberOfLines = 0
		label.translatesAutoresizingMaskIntoConstraints = false
		label.adjustsFontForContentSizeCategory = true
		let inset = CGFloat(10)
		NSLayoutConstraint.activate([
			label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: inset),
			label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -inset),
			label.topAnchor.constraint(equalTo: topAnchor, constant: inset),
			label.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -inset)
		])
		label.font = UIFont.preferredFont(forTextStyle: .title3)
	}
}
