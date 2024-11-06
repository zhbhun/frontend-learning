//
//  WaterfallViewPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit

class UICollectionViewWaterfallLayoutPlayground: UIViewController {
	
	private var collectionView: UICollectionView!
	private var dataSource: UICollectionViewDiffableDataSource<Section, Item>!
	
	enum Section: Int, CaseIterable {
		case one
		case two
		
		var title: String {
			switch self {
			case .one:
				return "One column"
			case .two:
				return "Two column"
			}
		}
	}
	
	// 内部类定义数据结构
	class Item: Hashable {
		let id = UUID()  // 唯一标识符
		let index: Int
		var color: UIColor
		var ratio: CGFloat
		
		init(index: Int, color: UIColor, ratio: CGFloat) {
			self.index = index
			self.color = color
			self.ratio = ratio
		}
		
		// 遵循 Hashable 协议
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
		setupCollectionView()
		setupDataSource()
		setupActionButtons()
	}
	
	private func setupCollectionView() {
		let layout = UICollectionViewWaterfallLayout()
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .white
		collectionView.delegate = self
		collectionView.register(WaterfallCell.self, forCellWithReuseIdentifier: WaterfallCell.identifier)
		collectionView.register(WaterfallHeader.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: WaterfallHeader.identifier)
		view.addSubview(collectionView)
	}
	
	private func setupDataSource() {
		let cellRegistration = UICollectionView.CellRegistration<WaterfallCell, Item> { (cell, indexPath, item) in
			cell.configure(with: item.index, color: item.color, ratio: item.ratio)
		}
		
		dataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) { collectionView, indexPath, item in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: item)
		}
		
		dataSource.supplementaryViewProvider = { (collectionView, kind, indexPath) in
			guard kind == UICollectionView.elementKindSectionHeader else { return nil }
			let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: WaterfallHeader.identifier, for: indexPath) as? WaterfallHeader
			header?.label.text = Section.allCases[indexPath.section].title
			return header
		}
		
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([Section.one])
		snapshot.appendItems(Item.generate(offset: 0, count: 10, ratio: 1.5), toSection: Section.one)
		snapshot.appendSections([Section.two])
		snapshot.appendItems(Item.generate(offset: 10, count: 30, ratio: nil), toSection: Section.two)
		dataSource.applySnapshotUsingReloadData(snapshot)
	}
}

extension UICollectionViewWaterfallLayoutPlayground: UICollectionViewWaterfallDelegate {
	// MARK: - UICollectionViewWaterfallDelegate
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, ratioForItemAt indexPath: IndexPath) -> CGFloat {
		guard let item = dataSource.itemIdentifier(for: indexPath) else { return 1 }
		return CGFloat(item.ratio)
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, heightForHeaderIn section: Int) -> CGFloat {
		return 50
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, heightForFooterIn section: Int) -> CGFloat {
		return 0
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, insetsFor section: Int) -> UIEdgeInsets {
		return UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumLineSpacingForSectionAt section: Int) -> CGFloat {
		return 10
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumInteritemSpacingForSectionAt section: Int) -> CGFloat {
		return 10
	}
	
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, columnCountFor section: Int) -> Int {
		let sectionType = Section(rawValue: section)
		switch sectionType {
		case .one:
			return 1
		case .two:
			return 2
		default:
			return 1
		}
	}
	
	func scrollViewDidScroll(_ scrollView: UIScrollView) {
		let offsetY = scrollView.contentOffset.y
		let contentHeight = scrollView.contentSize.height
		let frameHeight = scrollView.frame.size.height
		
		if offsetY > contentHeight - frameHeight - 300 {
			loadMoreItems()
		}
	}
	
	func loadMoreItems() {
		var snapshot = dataSource.snapshot()
		let items = snapshot.itemIdentifiers(inSection: .two)
		guard let lastItem = items.last else { return }
		let moreItems = Item.generate(offset: lastItem.index + 1, count: 30, ratio: nil)
		snapshot.appendItems(moreItems, toSection: .two)
		dataSource.apply(snapshot, animatingDifferences: true)
	}
}

extension UICollectionViewWaterfallLayoutPlayground {
	// 设置操作按钮
	private func setupActionButtons() {
		let buttonStack = UIStackView()
		buttonStack.axis = .horizontal
		buttonStack.spacing = 10
		buttonStack.distribution = .fillEqually
		
		let insertButton = UIButton(type: .system)
		insertButton.setTitle("Insert", for: .normal)
		insertButton.addTarget(self, action: #selector(insertItem), for: .touchUpInside)
		
		let deleteButton = UIButton(type: .system)
		deleteButton.setTitle("Delete", for: .normal)
		deleteButton.addTarget(self, action: #selector(deleteItem), for: .touchUpInside)
		
		let moveButton = UIButton(type: .system)
		moveButton.setTitle("Move", for: .normal)
		moveButton.addTarget(self, action: #selector(moveItem), for: .touchUpInside)
		
		let updateButton = UIButton(type: .system)
		updateButton.setTitle("Update", for: .normal)
		updateButton.addTarget(self, action: #selector(updateItem), for: .touchUpInside)
		
		buttonStack.addArrangedSubview(insertButton)
		buttonStack.addArrangedSubview(deleteButton)
		buttonStack.addArrangedSubview(moveButton)
		buttonStack.addArrangedSubview(updateButton)
		
		let container = UIView()
		container.backgroundColor = .white
		container.addSubview(buttonStack)
		view.addSubview(container)
		
		container.snp.makeConstraints{ make in
			make.bottom.equalToSuperview()
			make.leading.equalToSuperview()
			make.trailing.equalToSuperview()
		}
		
		buttonStack.snp.makeConstraints { make in
			make.top.equalToSuperview().offset(10)
			make.bottom.equalToSuperview().offset(-34)
			make.leading.equalToSuperview().offset(15)
			make.trailing.equalToSuperview().offset(-15)
		}
	}
	
	// 插入新项
	@objc private func insertItem() {
		var snapshot = dataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: .one).first else { return }
		let newItem = Item(index: Int.random(in: 1000...1000000), color: UIColor(
			red: CGFloat.random(in: 0...1),
			green: CGFloat.random(in: 0...1),
			blue: CGFloat.random(in: 0...1),
			alpha: 1.0
		), ratio: CGFloat.random(in: 0.5...1.5))
		snapshot.insertItems([newItem], beforeItem: firstItem)
		dataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 删除项
	@objc private func deleteItem() {
		var snapshot = dataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: .one).first else { return }
		snapshot.deleteItems([firstItem])
		dataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 移动项
	@objc private func moveItem() {
		var snapshot = dataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: .one)
		guard firstItems.count > 1 else { return }
		let firstItem = firstItems[0]
		let secondItem = firstItems[1]
		snapshot.moveItem(firstItem, afterItem: secondItem)
		dataSource.apply(snapshot, animatingDifferences: true)
	}
	
	// 更新项
	@objc private func updateItem() {
		var snapshot = dataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: .one).first else { return }
		firstItem.color = UIColor(
			red: CGFloat.random(in: 0...1),
			green: CGFloat.random(in: 0...1),
			blue: CGFloat.random(in: 0...1),
			alpha: 1.0
		)
		firstItem.ratio = CGFloat.random(in: 0.5...1.5)
		snapshot.reloadItems([firstItem])
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

fileprivate protocol UICollectionViewWaterfallDelegate: UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						ratioForItemAt indexPath: IndexPath) -> CGFloat
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						heightForHeaderIn section: Int) -> CGFloat
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						heightForFooterIn section: Int) -> CGFloat
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						insetsFor section: Int) -> UIEdgeInsets
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						minimumLineSpacingForSectionAt section: Int) -> CGFloat
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						minimumInteritemSpacingForSectionAt section: Int) -> CGFloat
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						columnCountFor section: Int) -> Int
}

extension UICollectionViewWaterfallDelegate {
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						ratioForItemAt indexPath: IndexPath) -> CGFloat {
		return 1 // 默认 1:1
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						heightForHeaderIn section: Int) -> CGFloat {
		return 0  // 默认无头部高度
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						heightForFooterIn section: Int) -> CGFloat {
		return 0  // 默认无尾部高度
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						insetsFor section: Int) -> UIEdgeInsets {
		return .zero  // 默认无边距
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						minimumLineSpacingForSectionAt section: Int) -> CGFloat {
		return 10  // 默认行间距
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						minimumInteritemSpacingForSectionAt section: Int) -> CGFloat {
		return 10  // 默认列间距
	}
	
	func collectionView(_ collectionView: UICollectionView,
						layout collectionViewLayout: UICollectionViewLayout,
						columnCountFor section: Int) -> Int {
		return 2  // 默认两列
	}
}

fileprivate class UICollectionViewWaterfallLayout: UICollectionViewLayout {
	public var columnCount: Int = 2 {
		didSet {
			invalidateLayout()
		}
	}
	
	public var minimumLineSpacingForSectionAt: CGFloat = 10 {
		didSet {
			invalidateLayout()
		}
	}
	
	public var minimumInteritemSpacingForSectionAt: CGFloat = 10 {
		didSet {
			invalidateLayout()
		}
	}
	
	public var headerHeight: CGFloat = 0 {
		didSet {
			invalidateLayout()
		}
	}
	
	public var footerHeight: CGFloat = 0 {
		didSet {
			invalidateLayout()
		}
	}
	
	public var sectionInset: UIEdgeInsets = .zero {
		didSet {
			invalidateLayout()
		}
	}
	
	public enum ItemRenderDirection: Int {
		case shortestFirst
		case leftToRight
		case rightToLeft
	}
	
	public var itemRenderDirection: ItemRenderDirection = .shortestFirst {
		didSet {
			invalidateLayout()
		}
	}
	
	public weak var delegate: UICollectionViewWaterfallDelegate? {
		return collectionView?.delegate as? UICollectionViewWaterfallDelegate
	}
	
	private var columnHeights: [[CGFloat]] = []
	private var sectionItemAttributes: [[UICollectionViewLayoutAttributes]] = []
	private var allItemAttributes: [UICollectionViewLayoutAttributes] = []
	private var headersAttributes: [Int: UICollectionViewLayoutAttributes] = [:]
	private var footersAttributes: [Int: UICollectionViewLayoutAttributes] = [:]
	private var unionRects: [CGRect] = []
	private let unionSize = 20
	
	private func columnCount(forSection section: Int) -> Int {
		return delegate?.collectionView(collectionView!, layout: self, columnCountFor: section) ?? columnCount
	}
	
	private func minimumLineSpacingForSection(forSection section: Int) -> CGFloat {
		return delegate?.collectionView(collectionView!, layout: self, minimumLineSpacingForSectionAt: section) ?? minimumLineSpacingForSectionAt
	}
	
	private func minimumInteritemSpacingForSection(forSection section: Int) -> CGFloat {
		return delegate?.collectionView(collectionView!, layout: self, minimumInteritemSpacingForSectionAt: section) ?? minimumInteritemSpacingForSectionAt
	}
	
	private var collectionViewContentWidth: CGFloat {
		let insets = collectionView!.contentInset
		return collectionView!.bounds.size.width - insets.left - insets.right
	}
	
	private func collectionViewContentWidth(ofSection section: Int) -> CGFloat {
		let insets = delegate?.collectionView(collectionView!, layout: self, insetsFor: section) ?? sectionInset
		return collectionViewContentWidth - insets.left - insets.right
	}
	
	public func itemWidth(inSection section: Int) -> CGFloat {
		let columnCount = self.columnCount(forSection: section)
		let spaceColumCount = CGFloat(columnCount - 1)
		let width = collectionViewContentWidth(ofSection: section)
		let minimumColumnSpacing = minimumInteritemSpacingForSection(forSection: section)
		return floor((width - (spaceColumCount * minimumColumnSpacing)) / CGFloat(columnCount))
	}
	
	/**
	 * prepare() 是布局的初始化方法，在每次布局更新前调用。
	 * - 时机：每次布局无效化时都会调用 prepare()，例如在屏幕旋转、数据源更新或手动调用 invalidateLayout() 时。
	 * - 用法：：在 prepare() 中计算全局的布局信息，比如每个单元格的位置、大小，分区的边界等。通常会将这些数据缓存起来，以提高 layoutAttributesForItem(at:) 和其他方法的访问效率。
	 */
	override public func prepare() {
		super.prepare()
		
		guard let collectionView = collectionView else { return }
		let numberOfSections = collectionView.numberOfSections
		if numberOfSections == 0 { return }
		
		headersAttributes = [:]
		footersAttributes = [:]
		unionRects = []
		allItemAttributes = []
		sectionItemAttributes = []
		columnHeights = (0 ..< numberOfSections).map { section in
			let columnCount = self.columnCount(forSection: section)
			return Array(repeating: 0, count: columnCount)
		}
		
		var top: CGFloat = 0.0
		
		for section in 0 ..< numberOfSections {
			let sectionInsets = delegate?.collectionView(collectionView, layout: self, insetsFor: section) ?? self.sectionInset
			let columnCount = self.columnCount(forSection: section)
			let itemWidth = self.itemWidth(inSection: section)
			let minimumLineSpacingForSection = self.minimumLineSpacingForSection(forSection: section)
			
			let heightHeader = delegate?.collectionView(collectionView, layout: self, heightForHeaderIn: section) ?? self.headerHeight
			if heightHeader > 0 {
				let attributes = UICollectionViewLayoutAttributes(forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, with: IndexPath(row: 0, section: section))
				attributes.frame = CGRect(x: 0, y: top, width: collectionView.bounds.width, height: heightHeader)
				headersAttributes[section] = attributes
				allItemAttributes.append(attributes)
				top = attributes.frame.maxY
			}
			top += sectionInsets.top
			columnHeights[section] = Array(repeating: top, count: columnCount)
			
			let itemCount = collectionView.numberOfItems(inSection: section)
			var itemAttributes: [UICollectionViewLayoutAttributes] = []
			
			for idx in 0 ..< itemCount {
				let indexPath = IndexPath(item: idx, section: section)
				let columnIndex = nextColumnIndexForItem(idx, inSection: section)
				let minimumColumnSpacing = minimumInteritemSpacingForSection(forSection: section)
				let xOffset = sectionInsets.left + (itemWidth + minimumColumnSpacing) * CGFloat(columnIndex)
				let yOffset = columnHeights[section][columnIndex]
				
				let itemRatio = delegate?.collectionView(collectionView, layout: self, ratioForItemAt: indexPath) ?? 1
				let itemHeight = floor(itemWidth / itemRatio)
				let attributes = UICollectionViewLayoutAttributes(forCellWith: indexPath)
				attributes.frame = CGRect(x: xOffset, y: yOffset, width: itemWidth, height: itemHeight)
				itemAttributes.append(attributes)
				allItemAttributes.append(attributes)
				columnHeights[section][columnIndex] = attributes.frame.maxY + minimumLineSpacingForSection
			}
			sectionItemAttributes.append(itemAttributes)
			
			let columnIndex  = longestColumnIndex(inSection: section)
			top = columnHeights[section][columnIndex] - minimumLineSpacingForSection + sectionInsets.bottom
			let footerHeight = delegate?.collectionView(collectionView, layout: self, heightForFooterIn: section) ?? self.footerHeight
			
			if footerHeight > 0 {
				let attributes = UICollectionViewLayoutAttributes(forSupplementaryViewOfKind: UICollectionView.elementKindSectionFooter, with: IndexPath(item: 0, section: section))
				attributes.frame = CGRect(x: 0, y: top, width: collectionView.bounds.width, height: footerHeight)
				footersAttributes[section] = attributes
				allItemAttributes.append(attributes)
				top = attributes.frame.maxY
			}
			
			columnHeights[section] = Array(repeating: top, count: columnCount)
		}
		
		var idx = 0
		let itemCounts = allItemAttributes.count
		while idx < itemCounts {
			let rect1 = allItemAttributes[idx].frame
			idx = min(idx + unionSize, itemCounts) - 1
			let rect2 = allItemAttributes[idx].frame
			unionRects.append(rect1.union(rect2))
			idx += 1
		}
	}
	
	override public var collectionViewContentSize: CGSize {
		guard collectionView!.numberOfSections > 0 else { return .zero }
		var contentSize = collectionView!.bounds.size
		contentSize.width = collectionViewContentWidth
		if let height = columnHeights.last?.first {
			contentSize.height = height
			return contentSize
		}
		return .zero
	}
	
	/**
	 * layoutAttributesForItem(at:) 返回指定 IndexPath 的单个单元格的布局属性。
	 * - 时机：通常由 layoutAttributesForElements(in:) 调用，来获取某个单元格的布局信息，也可能直接被 UICollectionView 用于获取特定单元格的布局。
	 * - 用法：返回单个单元格的位置、大小等布局信息。通常从 prepare() 预计算的数据中读取属性，构造并返回一个 UICollectionViewLayoutAttributes 对象。
	 */
	override public func layoutAttributesForItem(at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		return sectionItemAttributes[indexPath.section][indexPath.item]
	}
	
	/**
	 * 返回指定类型（如页眉或页脚）和 IndexPath 的补充视图的布局属性。
	 * - 时机：在 layoutAttributesForElements(in:) 中被调用，或者在 UICollectionView 需要某个补充视图的布局属性时调用。
	 * - 用法：返回一个 UICollectionViewLayoutAttributes 对象，定义补充视图的布局。补充视图通常是页眉、页脚，或者其他自定义的辅助视图。
	 */
	override public func layoutAttributesForSupplementaryView(ofKind elementKind: String, at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		if elementKind == UICollectionView.elementKindSectionHeader {
			return headersAttributes[indexPath.section]
		} else if elementKind == UICollectionView.elementKindSectionFooter {
			return footersAttributes[indexPath.section]
		}
		return nil
	}
	
	/**
	 * layoutAttributesForElements(in:) 返回指定矩形区域内的所有布局属性。
	 * - 时机：当 UICollectionView 需要展示新的内容区域时会调用此方法，例如在滚动时。
	 * - 用法：从缓存中获取所有在 rect 区域内的布局属性，打包成一个数组并返回。这是一个批量方法，UICollectionView 可以利用它快速获取可见区域的所有元素布局。
	 */
	override public func layoutAttributesForElements(in rect: CGRect) -> [UICollectionViewLayoutAttributes]? {
		return allItemAttributes.filter { rect.intersects($0.frame) }
	}
	
	/**
	 * 当 UICollectionView 的边界发生改变时调用，返回 true 时会重新布局。例如，在屏幕旋转或视图大小改变时，此方法可用于动态适应新边界。
	 */
	override public func shouldInvalidateLayout(forBoundsChange newBounds: CGRect) -> Bool {
		return newBounds.width != collectionView?.bounds.width
	}
	
	private func shortestColumnIndex(inSection section: Int) -> Int {
		return columnHeights[section].enumerated().min { $0.element < $1.element }?.offset ?? 0
	}
	
	private func longestColumnIndex(inSection section: Int) -> Int {
		return columnHeights[section].enumerated().max { $0.element < $1.element }?.offset ?? 0
	}
	
	private func nextColumnIndexForItem(_ item: Int, inSection section: Int) -> Int {
		let columnCount = self.columnCount(forSection: section)
		switch itemRenderDirection {
		case .shortestFirst: return shortestColumnIndex(inSection: section)
		case .leftToRight: return item % columnCount
		case .rightToLeft: return (columnCount - 1) - (item % columnCount)
		}
	}
}
