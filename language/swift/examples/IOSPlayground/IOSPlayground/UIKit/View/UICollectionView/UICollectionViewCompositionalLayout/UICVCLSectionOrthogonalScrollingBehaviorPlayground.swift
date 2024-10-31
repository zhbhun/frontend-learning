//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLSectionOrthogonalScrollingBehaviorPlayground: UIViewController {
	static let headerElementKind = "header-element-kind"

	enum SectionKind: Int, CaseIterable {
		case continuous, continuousGroupLeadingBoundary, paging, groupPaging, groupPagingCentered, none
		func orthogonalScrollingBehavior() -> UICollectionLayoutSectionOrthogonalScrollingBehavior {
			switch self {
			case .none:
				// 不启用正交滚动
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.none
			case .continuous:
				// 允许 section 在正交方向上连续（平滑）滚动。
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.continuous
			case .continuousGroupLeadingBoundary:
				// 滚动时内容可以平滑滑动，滚动停止后会对齐到每个 group 的起始位置。
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.continuousGroupLeadingBoundary
			case .paging:
				// section 的内容按页滚动，每次滚动会翻到一整页，类似于分页效果。
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.paging
			case .groupPaging:
				// 让 section 的内容按 group 分页，每次滚动到下一个完整的 group —— 与 .paging 类似，但分页粒度更细，滚动行为会对齐到下一个 group。
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.groupPaging
			case .groupPagingCentered:
				// 让 section 内容按 group 分页，每次滚动到下一个完整的 group，且每个 group 会在 section 的中心对齐。
				return UICollectionLayoutSectionOrthogonalScrollingBehavior.groupPagingCentered
			}
		}
	}
	var dataSource: UICollectionViewDiffableDataSource<Int, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Section orthogonalScrollingBehavior"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICVCLSectionOrthogonalScrollingBehaviorPlayground {
	
	func createLayout() -> UICollectionViewLayout {
		let config = UICollectionViewCompositionalLayoutConfiguration()
		config.interSectionSpacing = 20
		
		let layout = UICollectionViewCompositionalLayout(sectionProvider: {
			(sectionIndex: Int, layoutEnvironment: NSCollectionLayoutEnvironment) -> NSCollectionLayoutSection? in
			guard let sectionKind = SectionKind(rawValue: sectionIndex) else { fatalError("unknown section kind") }
			
			let leadingItem = NSCollectionLayoutItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(0.7),
					heightDimension: .fractionalHeight(1.0)
				)
			)
			leadingItem.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
			
			let trailingItem = NSCollectionLayoutItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .fractionalHeight(0.3)
				)
			)
			trailingItem.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
			let trailingGroup = NSCollectionLayoutGroup.vertical(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(0.3),
					heightDimension: .fractionalHeight(1.0)
				),
				repeatingSubitem: trailingItem,
				count: 2
			)
			
			let orthogonallyScrolls = sectionKind.orthogonalScrollingBehavior() != .none
			let containerGroupFractionalWidth = orthogonallyScrolls ? CGFloat(0.85) : CGFloat(1.0)
			let containerGroup = NSCollectionLayoutGroup.horizontal(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(containerGroupFractionalWidth),
					heightDimension: .fractionalHeight(0.4)
				),
				subitems: [leadingItem, trailingGroup]
			)

			let section = NSCollectionLayoutSection(group: containerGroup)
			section.orthogonalScrollingBehavior = sectionKind.orthogonalScrollingBehavior()
			
			let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .estimated(44)
				),
				elementKind: UICVCLSectionOrthogonalScrollingBehaviorPlayground.headerElementKind,
				alignment: .top
			)
			section.boundarySupplementaryItems = [sectionHeader]
			return section
			
		}, configuration: config)
		return layout
	}
}

extension UICVCLSectionOrthogonalScrollingBehaviorPlayground {
	func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .systemBackground
		view.addSubview(collectionView)
		collectionView.delegate = self
	}
	func configureDataSource() {
		
		let cellRegistration = UICollectionView.CellRegistration<TextCell, Int> { (cell, indexPath, identifier) in
			// Populate the cell with our item description.
			cell.label.text = "\(indexPath.section), \(indexPath.item)"
			cell.contentView.backgroundColor = .systemBlue
			cell.contentView.layer.borderColor = UIColor.black.cgColor
			cell.contentView.layer.borderWidth = 1
			cell.contentView.layer.cornerRadius = 8
			cell.label.textAlignment = .center
			cell.label.font = UIFont.preferredFont(forTextStyle: .title1)
		}
		
		dataSource = UICollectionViewDiffableDataSource<Int, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			// Return the cell.
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		let supplementaryRegistration = UICollectionView.SupplementaryRegistration
		<TitleSupplementaryView>(elementKind: UICVCLSectionOrthogonalScrollingBehaviorPlayground.headerElementKind) {
			(supplementaryView, string, indexPath) in
			let sectionKind = SectionKind(rawValue: indexPath.section)!
			supplementaryView.label.text = "." + String(describing: sectionKind)
		}
		
		dataSource.supplementaryViewProvider = { (view, kind, index) in
			return self.collectionView.dequeueConfiguredReusableSupplementary(
				using: supplementaryRegistration, for: index)
		}
		
		// initial data
		var snapshot = NSDiffableDataSourceSnapshot<Int, Int>()
		var identifierOffset = 0
		let itemsPerSection = 18
		SectionKind.allCases.forEach {
			snapshot.appendSections([$0.rawValue])
			let maxIdentifier = identifierOffset + itemsPerSection
			snapshot.appendItems(Array(identifierOffset..<maxIdentifier))
			identifierOffset += itemsPerSection
		}
		dataSource.apply(snapshot, animatingDifferences: false)
	}
}

extension UICVCLSectionOrthogonalScrollingBehaviorPlayground: UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		collectionView.deselectItem(at: indexPath, animated: true)
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
