//
//  WaterfallViewPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit

class UICVCLWaterfallPlayground: UIViewController {
	private var collectionView: UICollectionView!
	private var dataSource: UICollectionViewDiffableDataSource<Section, Item>!
	
	enum Section: Hashable {
		case one
		case two(page: Int)
		
		var title: String {
			switch self {
			case .one:
				return "一列布局"
			case .two:
				return "两列布局"
			}
		}
	}
	
	class Item: Hashable {
		let id = UUID()
		let index: Int
		let color: UIColor
		let ratio: CGFloat
		
		init(index: Int, color: UIColor, ratio: CGFloat) {
			self.index = index
			self.color = color
			self.ratio = ratio
		}
		
		func hash(into hasher: inout Hasher) {
			hasher.combine(id)
		}
		
		static func == (lhs: Item, rhs: Item) -> Bool {
			return lhs.id == rhs.id
		}
		
		static func generate(offset: Int, count: Int, ratio: CGFloat?) -> [Item] {
			var items: [Item] = []
			for i in 0..<count {
				let index = offset + i
				let ratio = ratio ?? CGFloat.random(in: 0.5...1.5)
				let color = UIColor(
					red: CGFloat.random(in: 0...1),
					green: CGFloat.random(in: 0...1),
					blue: CGFloat.random(in: 0...1),
					alpha: 1.0
				)
				items.append(Item(index: index, color: color, ratio: ratio))
			}
			return items
		}
	}
	
	override func viewDidLoad() {
		super.viewDidLoad()
		title = "Waterfall"
		setupCollectionView()
		setupDataSource()
	}
	
	private func setupCollectionView() {
		let layout = createWaterfallCompositionalLayout()
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .white
		collectionView.delegate = self
		view.addSubview(collectionView)
	}
	
	private func setupDataSource() {
		let cellRegistration = UICollectionView.CellRegistration<WaterfallCell, Item> { (cell, indexPath, item) in
			cell.configure(with: item.index, color: item.color, ratio: item.ratio)
		}
		
		dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) { collectionView, indexPath, item in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: item)
		}
		
		let headerRegistration = UICollectionView.SupplementaryRegistration<WaterfallHeader>(elementKind: UICollectionView.elementKindSectionHeader) {(header, string, indexPath) in
			let section = self.dataSource.snapshot().sectionIdentifiers[indexPath.section]
			if case let .two(page) = section {
				header.label.text = "\(section.title)(\(page))"
			} else {
				header.label.text = section.title
			}
		}
		
		dataSource.supplementaryViewProvider = { (collectionView, kind, index) in
			return self.collectionView.dequeueConfiguredReusableSupplementary(using: headerRegistration, for: index)
		}
		
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.one, .two(page: 1)])
		snapshot.appendItems(Item.generate(offset: 0, count: 30, ratio: 1.5), toSection: .one)
		snapshot.appendItems(Item.generate(offset: 30, count: 30, ratio: nil), toSection: .two(page: 1))
		dataSource.applySnapshotUsingReloadData(snapshot)
	}
	
	private var layoutCache: [Int: NSCollectionLayoutSection] = [:]
	
	private func createWaterfallCompositionalLayout() -> UICollectionViewLayout {
		return UICollectionViewCompositionalLayout { [weak self] (sectionIndex, layoutEnvironment) -> NSCollectionLayoutSection? in
			guard let self = self else { return nil }
			
			if let cachedSection = self.layoutCache[sectionIndex] {
				return cachedSection
			}
			
			print(">> \(sectionIndex)")
			
			let section = self.dataSource.snapshot().sectionIdentifiers[sectionIndex]
			
			switch section {
			case .one:
				let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1), heightDimension: .absolute(50))
				let item = NSCollectionLayoutItem(layoutSize: itemSize)
				let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .absolute(50))
				let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])
				let section = NSCollectionLayoutSection(group: group)
				section.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 15, bottom: 10, trailing: 15)
				section.interGroupSpacing = 15
				let headerSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .absolute(50))
				let header = NSCollectionLayoutBoundarySupplementaryItem(layoutSize: headerSize, elementKind: UICollectionView.elementKindSectionHeader, alignment: .top)
				section.boundarySupplementaryItems = [header]
				self.layoutCache[sectionIndex] = section
				return section
			case .two:
				let section = NSCollectionLayoutSection.waterfall(
					contentInsets: NSDirectionalEdgeInsets(top: 10, leading: 15, bottom: 10, trailing: 15),
					numberOfItems: collectionView.numberOfItems(inSection: sectionIndex),
					columnCount: 2,
					itemRatioProvider: { [weak self] index in
						guard let self = self else { return CGFloat(1) }
						let item = self.dataSource.itemIdentifier(for: IndexPath(item: index, section: sectionIndex))
						guard let item = item else { return CGFloat(1) }
						return CGFloat(item.ratio)
					},
					interItemSpacing: CGFloat(10),
					lineSpacing: CGFloat(10)
				)
				let headerSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .absolute(50))
				let header = NSCollectionLayoutBoundarySupplementaryItem(layoutSize: headerSize, elementKind: UICollectionView.elementKindSectionHeader, alignment: .top)
				section.boundarySupplementaryItems = [header]
				self.layoutCache[sectionIndex] = section
				return section
			}
		}
	}
}

extension UICVCLWaterfallPlayground: UICollectionViewDelegate {
	func scrollViewDidScroll(_ scrollView: UIScrollView) {
		let offsetY = scrollView.contentOffset.y
		let contentHeight = scrollView.contentSize.height
		let frameHeight = scrollView.frame.size.height
		
		if offsetY > contentHeight - frameHeight - 300 {
			loadNextPage()
		}
	}
	
	private func loadNextPage() {
		// Check the current pages in the snapshot to determine the next page
		let currentPages = dataSource.snapshot().sectionIdentifiers.compactMap { section -> Int? in
			if case let .two(page) = section { return page }
			return nil
		}
		
		guard let maxPage = currentPages.max() else { return }
		
		let nextPage = maxPage + 1
		var snapshot = dataSource.snapshot()
		
		// Append the new section for the next page
		let newItems = Item.generate(offset: nextPage * 30, count: 30, ratio: nil)
		snapshot.appendSections([.two(page: nextPage)])
		snapshot.appendItems(newItems, toSection: .two(page: nextPage))
		
		dataSource.apply(snapshot, animatingDifferences: true)
	}
}

fileprivate class WaterfallHeader: UICollectionReusableView {
	static let identifier = "WaterfallHeader"
	
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


// MARK: - Custom WaterfallCell
fileprivate class WaterfallCell: UICollectionViewCell {
	static let identifier = "WaterfallCell"
	
	private let label = UILabel()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		label.translatesAutoresizingMaskIntoConstraints = false
		label.textAlignment = .center
		label.textColor = .white
		label.font = UIFont.boldSystemFont(ofSize: 16)
		
		NSLayoutConstraint.activate([
			label.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
			label.centerYAnchor.constraint(equalTo: contentView.centerYAnchor)
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
	func configure(with index: Int, color: UIColor, ratio: CGFloat) {
		contentView.backgroundColor = color
		label.text = "Item \(index)\nRatio: \(String(format: "%.2f", ratio))"
	}
}

extension NSCollectionLayoutSection {
	static func waterfall(
		contentInsets: NSDirectionalEdgeInsets,
		numberOfItems: Int,
		columnCount: Int,
		itemRatioProvider: @escaping (Int) -> CGFloat,
		interItemSpacing: CGFloat,
		lineSpacing: CGFloat) -> NSCollectionLayoutSection {
			let group = NSCollectionLayoutGroup.custom(layoutSize: NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .estimated(300))) { environment in
				let contentWidth = environment.container.contentSize.width - contentInsets.leading - contentInsets.trailing
				let itemWidth = (contentWidth - CGFloat(columnCount - 1) * interItemSpacing) / CGFloat(columnCount)
				var layoutAttributes: [NSCollectionLayoutGroupCustomItem] = []
				var columnHeights = Array(repeating: CGFloat(0), count: columnCount)
				for i in 0..<Int(numberOfItems) {
					let columnIndex = columnHeights.enumerated().min(by: { $0.element < $1.element })?.offset ?? 0
					let xOffset = CGFloat(columnIndex) * (itemWidth + interItemSpacing)
					let itemHeight = itemWidth / itemRatioProvider(i)
					let yOffset = columnHeights[columnIndex]
					
					let frame = CGRect(x: xOffset, y: yOffset, width: itemWidth, height: itemHeight)
					layoutAttributes.append(NSCollectionLayoutGroupCustomItem(frame: frame))
					
					columnHeights[columnIndex] += itemHeight + lineSpacing
				}
				return layoutAttributes
			}
			let section = NSCollectionLayoutSection(group: group)
			section.contentInsets = contentInsets
			return section
		}
}
