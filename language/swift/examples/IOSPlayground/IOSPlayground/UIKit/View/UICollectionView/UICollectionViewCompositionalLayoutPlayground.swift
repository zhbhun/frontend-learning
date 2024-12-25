//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICollectionViewCompositionalLayoutPlayground: UIViewController {
	enum Section: Int {
		case layoutItemSize
		case layoutItemContentInsets
		case layoutItemEdgeSpacingWithFixed
		case layoutItemEdgeSpacingWithFlexible
		case layoutItemSupplementaryItems
		case layoutGroupSubitems
		case layoutGroupRepeatingSubitem
		case layoutGroupInterItemSpacing
		case layoutGroupContentInsets
		case layoutGroupNesting
		case layoutSectionBoundarySupplementaryItems
		case layoutSectionDecorationItems
		case layoutSectionOrthogonalScrollingBehavior
		case layoutSectionVisibleItemsInvalidationHandler

		var title: String {
			switch self {
			case .layoutItemSize:
				return "NSCollectionLayoutItem#itemSize"
			case .layoutItemContentInsets:
				return "NSCollectionLayoutItem#contentInsets"
			case .layoutItemEdgeSpacingWithFixed:
				return "NSCollectionLayoutItem#edgeSpacing=fixed"
			case .layoutItemEdgeSpacingWithFlexible:
				return "NSCollectionLayoutItem#edgeSpacing=flexible"
			case .layoutItemSupplementaryItems:
				return "NSCollectionLayoutItem#supplementaryItems"
			case .layoutGroupSubitems:
				return "NSCollectionLayoutGroup#subitems"
			case .layoutGroupRepeatingSubitem:
				return "NSCollectionLayoutGroup#repeatingSubitem"
			case .layoutGroupInterItemSpacing:
				return "NSCollectionLayoutGroup#interItemSpacing"
			case .layoutGroupContentInsets:
				return "NSCollectionLayoutGroup#contentInsets"
			case .layoutGroupNesting:
				return "NSCollectionLayoutGroup#nesting"
			case .layoutSectionBoundarySupplementaryItems:
				return "NSCollectionLayoutSection#boundarySupplementaryItems"
			case .layoutSectionDecorationItems:
				return "NSCollectionLayoutSection#decorationItems"
			case .layoutSectionOrthogonalScrollingBehavior:
				return "NSCollectionLayoutSection#orthogonalScrollingBehavior"
			case .layoutSectionVisibleItemsInvalidationHandler:
				return "NSCollectionLayoutSection#visibleItemsInvalidationHandler"
			}
		}
	}
	
	class Item: Hashable {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
		}
		
		func hash(into hasher: inout Hasher) {
			hasher.combine(id)
		}
		
		static func == (lhs: Item, rhs: Item) -> Bool {
			return lhs.id == rhs.id
		}
	}

	var dataSource: UICollectionViewDiffableDataSource<Section, Item>! = nil
	var collectionView: UICollectionView! = nil

	override func viewDidLoad() {
		super.viewDidLoad()
		title = "UICollectionViewCompositionalLayout"
		configureHierarchy()
		configureDataSource()
	}
}

extension UICollectionViewCompositionalLayoutPlayground {
	func createLayout() -> UICollectionViewLayout {
		let layout = UICollectionViewCompositionalLayout {
			[weak self] (sectionIndex: Int, layoutEnvironment: NSCollectionLayoutEnvironment) -> NSCollectionLayoutSection? in
			guard let self = self else { return nil}
			let section = Section(rawValue: sectionIndex)
			let sectionHeader = NSCollectionLayoutBoundarySupplementaryItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .estimated(50)
				),
				elementKind: UICollectionView.elementKindSectionHeader,
				alignment: .top
			)
			switch section {
			case .layoutItemSize:
				/*
				 +------+----+---+
				 |   1  |  2 | 3 |
				 +------+----+---+
				 |  11  | 12 | 13|
				 +------+----+---+
				 |  101 | 102|
				 +------+----+---+
				 |  103 | 104|
				 +------+----+
				 */
				let item1Width = CGFloat(0.5)
				let item3Width = CGFloat(40)
				let item2Width = self.view.bounds.width * item1Width - item3Width

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
						widthDimension: .absolute(item2Width),
						// 固定高度 40pt
						heightDimension: .absolute(40)
					)
				)
				let item3 = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						// 预估宽度 40pt，显示是会按内容缩放显示，超出一行时会换行显示
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
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutItemContentInsets:
				/*
				 +-----+-----+-----+-----+
				 |  1  |  2  |  3  |  4  |
				 +-----+-----+-----+-----+
				*/
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.25),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				/*
				 * contentInsets 设置 item 的内边距
				 * - 不会影响 item 的大小
				 * - 不同 item 之间的边距会叠加（所以两边的留白会比中间的小）
				 */
				item.contentInsets = NSDirectionalEdgeInsets(
					top: 10,
					leading: 15,
					bottom: 10,
					trailing: 15
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.25)
					),
					subitems: [item]
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutItemEdgeSpacingWithFixed:
				/*
				 +-----+-----+-----+-----+
				 |  1  |  2  |  3  |  4  |
				 +-----+-----+-----+-----+
				*/
				let horizontalSpacing = CGFloat(15)
				let columnCount = CGFloat(4)
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .absolute((self.view.bounds.width - horizontalSpacing * columnCount * 2) / columnCount),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				/**
				 * 对比 contentInsets，edgeSpacing 是个外边距，不算在 layoutSize 里，并且会影响 fractionalWidth/fractionalHeight 的计算
				 *
				 * - NSCollectionLayoutSpacing.fixed 固定大小显示
				 * - NSCollectionLayoutSpacing.flexible 可以根据 Group 剩余空间自动缩放
				 */
				item.edgeSpacing = NSCollectionLayoutEdgeSpacing(
					leading: .fixed(horizontalSpacing),
					top: .fixed(10),
					trailing: .fixed(horizontalSpacing),
					bottom: .fixed(10)
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.25)
					),
					subitems: [item]
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutItemEdgeSpacingWithFlexible:
				/*
				 +-----+-----+-----+
				 |  1  |  2  |  3  |
				 +-----+-----+-----+
				*/
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.3),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				item.edgeSpacing = NSCollectionLayoutEdgeSpacing(
					leading: .flexible(1),
					top: .fixed(0),
					trailing: .flexible(1),
					bottom: .fixed(0)
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.25)
					),
					subitems: [item]
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutItemSupplementaryItems:
				/*
				 +-----0-----1-----2-----4
				 |  1  |  2  |  3  |  4  |
				 +-----+-----+-----+-----+
				 */
				let badge = NSCollectionLayoutSupplementaryItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .absolute(20),
						heightDimension: .absolute(20)
					),
					elementKind: BadgeSupplementaryView.elementKind,
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
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutGroupSubitems:
				/*
				 +---+-—----+---------+---+------+
				 | 1 |   2  |    3    | 4 |   5  |
				 +---+------+---------+---+------+
				 | 6 |   7  |    8    | 9 |
				 +---+------+---------+---+
				*/
				let item1 = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.1),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let item2 = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.2),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let item3 = NSCollectionLayoutItem(
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
					/**
					 * Group 代表每一行或每一列
					 *
					 * - 每一行或一列会按 subitems 里 item 顺序设置对应大小
					 * - 一行或或一列有剩余空间时，会按 subitems 里 item 顺序重新开始排列，直到一行放不下为止
					 * - 如果当前 subitems 还没有排完，但是一行或一列不够放了，会换行从头开始按 subitems 里的 item 顺序设置对应大小
					 */
					subitems: [item1, item2, item3]
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutGroupRepeatingSubitem:
				/*
				 +-----+-----+--+---
				 |  1  |  2  |  |3
				 +-----+-----+--+---
				 |  4  |
				 +-----+
				*/
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
					// iOS 16+，每一行严格按 subitem 的数量排列显示，超出一行则溢出屏幕显示（可以配置滚动显示）
					repeatingSubitem: item,
					count: 3
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutGroupInterItemSpacing:
				/*
				 +-----+-+-----+
				 |  1  | |  2  |
				 +-----+-+-----+
				 |  3  |
				 +-----+
				 */
				let item = NSCollectionLayoutItem(
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
					subitems: [item]
				)
				// group 内的 item 之间的而间距，item fractional 大小按照扣除间距后计算
				group.interItemSpacing = .fixed(10)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutGroupContentInsets:
				/*
				 ｜---------------｜
				 ｜ +-----+-----+ ｜
				 ｜ |  1  |  2  | ｜
				 ｜ +-----+-----+ ｜
				 ｜---------------｜
				 */
				let item = NSCollectionLayoutItem(
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
					subitems: [item]
				)
				group.contentInsets = NSDirectionalEdgeInsets(
					top: 10,
					leading: 15,
					bottom: 10,
					trailing: 15
				)
				let section = NSCollectionLayoutSection(group: group)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutGroupNesting:
				/*
				 +-------+-------+
				 |       |   2   |
				 |   1   +-------+
				 |       |   3   |
				 +-------+-------+
				 */
				let leadingItem = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.5),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				leadingItem.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
				
				let trailingItem = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalHeight(0.5)
					)
				)
				trailingItem.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
				let trailingGroup = NSCollectionLayoutGroup.vertical(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.5),
						heightDimension: .fractionalHeight(1.0)
					),
					repeatingSubitem: trailingItem,
					count: 2
				)
				let nestedGroup = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(1)
					),
					subitems: [leadingItem, trailingGroup]
				)
				let section = NSCollectionLayoutSection(group: nestedGroup)
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutSectionBoundarySupplementaryItems:
				let item = NSCollectionLayoutItem(layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .fractionalHeight(1.0)
				))
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .absolute(300)
					),
					subitems: [item]
				)
				let section = NSCollectionLayoutSection(group: group)
				// goup 间距
				section.interGroupSpacing = 20
				// 内边距
				section.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 15, bottom: 0, trailing: 15)
				let headerFooterSize = NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					// 预估高度可能被实际内容撑开
					heightDimension: .estimated(44)
				)
				let sectionFooter = NSCollectionLayoutBoundarySupplementaryItem(
					layoutSize: headerFooterSize,
					elementKind: UICollectionView.elementKindSectionFooter,
					alignment: .bottom
				)
				sectionHeader.pinToVisibleBounds = true
				sectionHeader.zIndex = 2
				sectionFooter.pinToVisibleBounds = true
				sectionFooter.zIndex = 2
				section.boundarySupplementaryItems = [sectionHeader, sectionFooter]
				return section
			case .layoutSectionDecorationItems:
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
				return section
			case .layoutSectionOrthogonalScrollingBehavior:
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				item.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.8),
						heightDimension: .fractionalHeight(0.4)
					),
					subitems: [item]
				)

				let section = NSCollectionLayoutSection(group: group)
				section.orthogonalScrollingBehavior = .continuous
				section.boundarySupplementaryItems = [sectionHeader]
				return section
			case .layoutSectionVisibleItemsInvalidationHandler:
				let item = NSCollectionLayoutItem(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(0.5),
						heightDimension: .fractionalHeight(1.0)
					)
				)
				let group = NSCollectionLayoutGroup.horizontal(
					layoutSize: NSCollectionLayoutSize(
						widthDimension: .fractionalWidth(1.0),
						heightDimension: .fractionalWidth(0.5)
					),
					subitems: [item, item]
				)
				group.interItemSpacing = .fixed(20)
				group.contentInsets = .init(top: 10, leading: 15, bottom: 10, trailing: 15)
				let section = NSCollectionLayoutSection(group: group)
				section.orthogonalScrollingBehavior = .continuous
				section.visibleItemsInvalidationHandler = { [weak self] (visibleItems, offset, environment) in
					guard let self = self else { return }
					visibleItems.forEach { item in
						if item.representedElementCategory == .cell {
							let distanceFromCenter = abs((item.frame.midX - offset.x) - environment.container.contentSize.width / 2.0)
							let minScale: CGFloat = 0.7
							let maxScale: CGFloat = 1.1
							let scale = CGFloat.maximum(maxScale - (distanceFromCenter / environment.container.contentSize.width), minScale)
							item.transform = CGAffineTransform(scaleX: scale, y: scale)
							let minAlpha: CGFloat = 0.5
							let maxAlpha: CGFloat = 1
							let alpha = CGFloat.maximum(maxAlpha - (distanceFromCenter / environment.container.contentSize.width), minAlpha)
							item.alpha = alpha
							// print(">> \(item.indexPath.item) \(distanceFromCenter) \(scale) \(alpha)")
							if let cell = self.collectionView.cellForItem(at: item.indexPath) as? TextCell {
								cell.label.textColor = UIColor(
									red: CGFloat.minimum(distanceFromCenter / (environment.container.contentSize.width / 2), 1),
									green: 0,
									blue: 0,
									alpha: 1
								)
							}
						}
					}
				}
				// 不能加 Header，加了后会有计算问题
				// section.boundarySupplementaryItems = [sectionHeader]
				return section
			default:
				return nil
			}
		}
		layout.register(
			SectionBackgroundDecorationView.self,
			forDecorationViewOfKind: UICVCLSectionDecorationItemsPlayground.sectionBackgroundDecorationElementKind
		)
		return layout
	}
}

extension UICollectionViewCompositionalLayoutPlayground {
	private func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .white
		view.addSubview(collectionView)
	}

	private func configureDataSource() {
		let cellRegistration = UICollectionView.CellRegistration<TextCell, Item> { (cell, indexPath, identifier) in
			// Populate the cell with our item description.
			cell.label.text = "\(identifier.title)"
		}

		dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Item) -> UICollectionViewCell? in
			// Return the cell.
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}

		let headerRegistration = UICollectionView.SupplementaryRegistration
		<HeaderView>(elementKind: UICollectionView.elementKindSectionHeader) {
			(supplementaryView, string, indexPath) in
			let section = Section(rawValue: indexPath.section)
			supplementaryView.label.text = section?.title
		}
		
		let footerRegistration = UICollectionView.SupplementaryRegistration
		<HeaderView>(elementKind: UICollectionView.elementKindSectionFooter) {
			(supplementaryView, string, indexPath) in
			let section = Section(rawValue: indexPath.section)
			supplementaryView.label.text = "\(section?.title ?? "") Footer"
		}
		
		let badgeRegistration = UICollectionView.SupplementaryRegistration
		<BadgeSupplementaryView>(elementKind: BadgeSupplementaryView.elementKind) {
			(supplementaryView, string, indexPath) in
			supplementaryView.label.text = "\(indexPath.item)"
		}

		dataSource.supplementaryViewProvider = { [weak self] (view, kind, index) in
			guard let self = self else { return nil }
			switch kind {
			case UICollectionView.elementKindSectionHeader:
				return self.collectionView.dequeueConfiguredReusableSupplementary(
					using: headerRegistration,
					for: index
				)
			case UICollectionView.elementKindSectionFooter:
				return self.collectionView.dequeueConfiguredReusableSupplementary(
					using: footerRegistration,
					for: index
				)
			case BadgeSupplementaryView.elementKind:
				return self.collectionView.dequeueConfiguredReusableSupplementary(
					using: badgeRegistration,
					for: index
				)
			default:
				return nil
			}
		}

		// initial data
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.layoutItemSize])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "11"),
			Item(id: UUID(), title: "12"),
			Item(id: UUID(), title: "13"),
			Item(id: UUID(), title: "101"),
			Item(id: UUID(), title: "102"),
			Item(id: UUID(), title: "103"),
			Item(id: UUID(), title: "104"),
		])
		snapshot.appendSections([.layoutItemContentInsets])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
		])
		snapshot.appendSections([.layoutItemEdgeSpacingWithFixed])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
		])
		snapshot.appendSections([.layoutItemEdgeSpacingWithFlexible])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
		])
		snapshot.appendSections([.layoutItemSupplementaryItems])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
		])
		snapshot.appendSections([.layoutGroupSubitems])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
			Item(id: UUID(), title: "5"),
			Item(id: UUID(), title: "6"),
			Item(id: UUID(), title: "7"),
			Item(id: UUID(), title: "8"),
			Item(id: UUID(), title: "9"),
		])
		snapshot.appendSections([.layoutGroupRepeatingSubitem])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
		])
		snapshot.appendSections([.layoutGroupInterItemSpacing])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3")
		])
		snapshot.appendSections([.layoutGroupContentInsets])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2")
		])
		snapshot.appendSections([.layoutGroupNesting])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3")
		])
		snapshot.appendSections([.layoutSectionBoundarySupplementaryItems])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3")
		])
		snapshot.appendSections([.layoutSectionDecorationItems])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3")
		])
		snapshot.appendSections([.layoutSectionOrthogonalScrollingBehavior])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
			Item(id: UUID(), title: "5"),
			Item(id: UUID(), title: "6")
		])
		snapshot.appendSections([.layoutSectionVisibleItemsInvalidationHandler])
		snapshot.appendItems([
			Item(id: UUID(), title: "1"),
			Item(id: UUID(), title: "2"),
			Item(id: UUID(), title: "3"),
			Item(id: UUID(), title: "4"),
			Item(id: UUID(), title: "5"),
			Item(id: UUID(), title: "6")
		])
		dataSource.applySnapshotUsingReloadData(snapshot)
	}
}

fileprivate class HeaderView: UICollectionReusableView {
	let label = UILabel()

	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}
	required init?(coder: NSCoder) {
		fatalError()
	}
}

extension HeaderView {
	func configure() {
		backgroundColor = .lightGray
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
		backgroundColor = .systemBlue
		layer.borderColor = UIColor.black.cgColor
		layer.borderWidth = 1
		label.textAlignment = .center
		label.translatesAutoresizingMaskIntoConstraints = false
		label.adjustsFontForContentSizeCategory = true
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

fileprivate class BadgeSupplementaryView: UICollectionReusableView {
	static let elementKind = "badge"
	
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
