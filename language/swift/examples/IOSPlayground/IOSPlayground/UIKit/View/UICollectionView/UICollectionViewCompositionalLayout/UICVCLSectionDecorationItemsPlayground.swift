//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLSectionDecorationItemsPlayground: UIViewController {
	
	static let sectionBackgroundDecorationElementKind = "section-background-element-kind"
	
	var currentSnapshot: NSDiffableDataSourceSnapshot<Int, Int>! = nil
	var dataSource: UICollectionViewDiffableDataSource<Int, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Section decorationItems"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLSectionDecorationItemsPlayground {
	/// - Tag: Background
	func createLayout() -> UICollectionViewLayout {
		let item = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1.0),
				heightDimension: .fractionalHeight(1.0)
			)
		)

		let group = NSCollectionLayoutGroup.horizontal(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1.0),
				heightDimension: .absolute(44)
			),
			subitems: [item]
		)
		
		let section = NSCollectionLayoutSection(group: group)
		section.interGroupSpacing = 5
		section.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
		
		let sectionBackgroundDecoration = NSCollectionLayoutDecorationItem.background(
			elementKind: UICVCLSectionDecorationItemsPlayground.sectionBackgroundDecorationElementKind
		)
		sectionBackgroundDecoration.contentInsets = NSDirectionalEdgeInsets(top: 5, leading: 5, bottom: 5, trailing: 5)
		section.decorationItems = [sectionBackgroundDecoration]
		
		let layout = UICollectionViewCompositionalLayout(section: section)
		layout.register(
			SectionBackgroundDecorationView.self,
			forDecorationViewOfKind: UICVCLSectionDecorationItemsPlayground.sectionBackgroundDecorationElementKind
		)
		return layout
	}
}

extension UICVCLSectionDecorationItemsPlayground {
	func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .systemBackground
		view.addSubview(collectionView)
		collectionView.delegate = self
	}
	func configureDataSource() {
		
		let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, Int> { (cell, indexPath, identifier) in
			// Populate the cell with our item description.
			let sectionIdentifier = self.currentSnapshot.sectionIdentifiers[indexPath.section]
			let numberOfItemsInSection = self.currentSnapshot.numberOfItems(inSection: sectionIdentifier)
			var content = cell.defaultContentConfiguration()
			content.text = "\(indexPath.section),\(indexPath.item)"
			cell.contentConfiguration = content
			cell.backgroundConfiguration = UIBackgroundConfiguration.clear()
			cell.backgroundColor = .clear
		}
		
		dataSource = UICollectionViewDiffableDataSource<Int, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			// Return the cell.
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		// initial data
		let itemsPerSection = 5
		let sections = Array(0..<5)
		currentSnapshot = NSDiffableDataSourceSnapshot<Int, Int>()
		var itemOffset = 0
		sections.forEach {
			currentSnapshot.appendSections([$0])
			currentSnapshot.appendItems(Array(itemOffset..<itemOffset + itemsPerSection))
			itemOffset += itemsPerSection
		}
		dataSource.apply(currentSnapshot, animatingDifferences: false)
	}
}

extension UICVCLSectionDecorationItemsPlayground: UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		collectionView.deselectItem(at: indexPath, animated: true)
	}
}

fileprivate class SectionBackgroundDecorationView: UICollectionReusableView {

	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}
	required init?(coder: NSCoder) {
		fatalError("not implemented")
	}
}

extension SectionBackgroundDecorationView {
	func configure() {
		backgroundColor = UIColor.lightGray.withAlphaComponent(0.5)
		layer.borderColor = UIColor.black.cgColor
		layer.borderWidth = 1
		layer.cornerRadius = 12
	}
}
