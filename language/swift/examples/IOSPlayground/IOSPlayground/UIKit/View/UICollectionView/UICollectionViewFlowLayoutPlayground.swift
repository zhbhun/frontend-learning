//
//  Untitled.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit
import SnapKit

class UICollectionViewFlowLayoutPlayground: UIViewController, UICollectionViewDelegate {
	class Item: Hashable {
		let id: UUID
		var title: String
		var height: Int
		
		init(id: UUID, title: String, height: Int) {
			self.id = id
			self.title = title
			self.height = height
		}
		
		func hash(into hasher: inout Hasher) {
			hasher.combine(id)
		}
		
		static func == (lhs: Item, rhs: Item) -> Bool {
			return lhs.id == rhs.id
		}
	}
	
	var collectionView: UICollectionView! = nil
	var diffableDataSource: UICollectionViewDiffableDataSource<Int, Item>! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewFlowLayout"
		
		configureCollectionView()
		configureDataSource()
		applyInitialData()
		setupActionButtons()
	}
	
	// 配置 CollectionView
	private func configureCollectionView() {
		let layout = LoggingCollectionViewFlowLayout()
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.delegate = self
		
		view.addSubview(collectionView)
	}
	
	// 配置数据源
	private func configureDataSource() {
		let cellRegistration = UICollectionView.CellRegistration<CustomCell, Item> { (cell, indexPath, item) in
			cell.label.text = item.title
			cell.contentView.backgroundColor = .red
		}
		diffableDataSource = UICollectionViewDiffableDataSource<Int, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: item)
		}
		
		let headerRegistration = UICollectionView.SupplementaryRegistration<CustomHeader>(
			elementKind: UICollectionView.elementKindSectionHeader
		) { (headerView, elementKind, indexPath) in
			headerView.label.text = "Header"
		}
		
		// 配置 section 头部视图
		diffableDataSource.supplementaryViewProvider = { (collectionView, kind, indexPath) in
			return collectionView.dequeueConfiguredReusableSupplementary(
				using: headerRegistration,
				for: indexPath
			)
		}
	}
	
	// 配置初始数据
	private func applyInitialData() {
		var snapshot = NSDiffableDataSourceSnapshot<Int, Item>()
		snapshot.appendSections([0])
		let items = (1...100).map { Item(id: UUID(), title: "\($0)", height: Int.random(in: 100...300)) }
		snapshot.appendItems(items, toSection: 0)
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}

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
		var snapshot = diffableDataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: 0).first else { return }
		let height = Int.random(in: 100...300)
		let newItem = Item(id: UUID(), title: "\(height)", height: height)
		snapshot.insertItems([newItem], beforeItem: firstItem)
		diffableDataSource.apply(snapshot, animatingDifferences: false)
	}
	
	// 删除项
	@objc private func deleteItem() {
		var snapshot = diffableDataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: 0).first else { return }
		snapshot.deleteItems([firstItem])
		diffableDataSource.apply(snapshot, animatingDifferences: false)
	}
	
	// 移动项
	@objc private func moveItem() {
		var snapshot = diffableDataSource.snapshot()
		let firstItems = snapshot.itemIdentifiers(inSection: 0)
		guard firstItems.count > 1 else { return }
		let firstItem = firstItems[0]
		let secondItem = firstItems[1]
		snapshot.moveItem(firstItem, afterItem: secondItem)
		diffableDataSource.apply(snapshot, animatingDifferences: false)
	}
	
	// 更新项
	@objc private func updateItem() {
		var snapshot = diffableDataSource.snapshot()
		guard let firstItem = snapshot.itemIdentifiers(inSection: 0).first else { return }
		let height = Int.random(in: 100...300)
		firstItem.title = "\(height)"
		firstItem.height = height
		snapshot.reloadItems([firstItem])
		diffableDataSource.apply(snapshot, animatingDifferences: false)
	}
}

extension UICollectionViewFlowLayoutPlayground: UICollectionViewDelegateFlowLayout {
	// 头大小
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> CGSize {
		return CGSize(width: UIScreen.main.bounds.width, height: 50)
	}
	
	// 内边距
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, insetForSectionAt section: Int) -> UIEdgeInsets {
		return UIEdgeInsets(top: 10, left: 15, bottom: 10, right: 15)
	}
	
	// 行大小
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
		let item = diffableDataSource.itemIdentifier(for: indexPath)
		return CGSize(width: view.bounds.width - 30, height: CGFloat(item?.height ?? 100))
	}
	
	// 行间距
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumInteritemSpacingForSectionAt section: Int) -> CGFloat {
		return 10
	}
}

// 自定义头部视图
fileprivate class CustomHeader: UICollectionReusableView {
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

// 自定义单元格
fileprivate class CustomCell: UICollectionViewCell {
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.textColor = .white
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}
}

/**
 * ## 初始化
 * 1. prepare()
 * 2. collectionViewContentSize - Size: (393.0, 21877.0)
 * 3. layoutAttributesForElements(in:) - Rect: (0.0, -852.0, 393.0, 1704.0)
 * 4. collectionViewContentSize - Size: (393.0, 21877.0)
 *
 * ## 滑动
 * 1. shouldInvalidateLayout(forBoundsChange:) - NewBounds: (0.0, -96, 393.0, 852.0), ShouldInvalidate: false — 滑动期间频繁调用来判断是否要刷新布局
 * 2. layoutAttributesForElements(in:) - Rect: (0.0, 0.0, 393.0, 1704.0) - 不一定调用，再需要时会调用
 * 3. collectionViewContentSize - Size: (393.0, 21877.0) - layoutAttributesForElements 调用后会再次调用该方法
 * 4. targetContentOffset(forProposedContentOffset:withScrollingVelocity:) - ProposedContentOffset: (0.0, -73.), Velocity: (0.0, 0.0), TargetOffset: (0.0, -73) - 返回最终停靠位置（滚动结束的位置）
 *
 * ## 数据：插入、删除、移动和更新
 * 1. prepare()
 * 2. collectionViewContentSize - Size: (393.0, 21570.0)
 * 3. prepare(forCollectionViewUpdates:) - UpdateItems: [INS(0-100)]
 * 4. layoutAttributesForElements(in:) - Rect: (0.0, -852.0, 393.0, 1704.0)
 * 5. collectionViewContentSize - Size: (393.0, 21570.0)
 * 6. finalizeCollectionViewUpdates()
 */
fileprivate class LoggingCollectionViewFlowLayout: UICollectionViewFlowLayout {
	
	/// 准备布局，通常在布局即将开始计算前调用。
	override func prepare() {
		super.prepare()
		print(">> prepare()")
	}
	
	/// 返回整个 collection view 的内容尺寸，用于确定滚动范围。
	override var collectionViewContentSize: CGSize {
		let size = super.collectionViewContentSize
		print(">> collectionViewContentSize - Size: \(size)")
		return size
	}
	
	/// 返回指定区域内所有元素的布局属性，用于决定在该区域内哪些元素应该显示。
	override func layoutAttributesForElements(in rect: CGRect) -> [UICollectionViewLayoutAttributes]? {
		let attributes = super.layoutAttributesForElements(in: rect)
		print(">> layoutAttributesForElements(in:) - Rect: \(rect)")
		return attributes
	}
	
	/// 返回特定位置的单个单元格的布局属性，用于计算该单元格的显示位置和大小。
	override func layoutAttributesForItem(at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		let attributes = super.layoutAttributesForItem(at: indexPath)
		print(">> layoutAttributesForItem(at:) - IndexPath: \(indexPath)")
		return attributes
	}
	
	/// 返回指定类型和位置的补充视图（如页眉、页脚）的布局属性。
	override func layoutAttributesForSupplementaryView(ofKind elementKind: String, at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		let attributes = super.layoutAttributesForSupplementaryView(ofKind: elementKind, at: indexPath)
		print(">> layoutAttributesForSupplementaryView(ofKind:at:) - ElementKind: \(elementKind), IndexPath: \(indexPath)")
		return attributes
	}
	
	/// 返回指定类型和位置的装饰视图的布局属性。装饰视图通常用于非交互的背景或装饰效果。
	override func layoutAttributesForDecorationView(ofKind elementKind: String, at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		let attributes = super.layoutAttributesForDecorationView(ofKind: elementKind, at: indexPath)
		print(">> layoutAttributesForDecorationView(ofKind:at:) - ElementKind: \(elementKind), IndexPath: \(indexPath)")
		return attributes
	}
	
	/// 当 collection view 的 bounds 发生改变时调用，确定是否需要重新布局。
	override func shouldInvalidateLayout(forBoundsChange newBounds: CGRect) -> Bool {
		let shouldInvalidate = super.shouldInvalidateLayout(forBoundsChange: newBounds)
		print(">> shouldInvalidateLayout(forBoundsChange:) - NewBounds: \(newBounds), ShouldInvalidate: \(shouldInvalidate)")
		return shouldInvalidate
	}
	
	/// 返回无效化上下文，用于指定在 bounds 发生变化时哪些部分需要更新。
	override func invalidationContext(forBoundsChange newBounds: CGRect) -> UICollectionViewLayoutInvalidationContext {
		let context = super.invalidationContext(forBoundsChange: newBounds)
		print(">> invalidationContext(forBoundsChange:) - NewBounds: \(newBounds)")
		return context
	}
	
	/// 在进行插入、删除、移动等更新操作之前调用，提供更新所需的布局准备工作。
	override func prepare(forCollectionViewUpdates updateItems: [UICollectionViewUpdateItem]) {
		super.prepare(forCollectionViewUpdates: updateItems)
		print(">> prepare(forCollectionViewUpdates:) - UpdateItems: \(updateItems)")
	}
	
	/// 在所有更新操作完成后调用，用于清理临时数据或完成更新。
	override func finalizeCollectionViewUpdates() {
		super.finalizeCollectionViewUpdates()
		print(">> finalizeCollectionViewUpdates()")
	}
	
	/// 返回最终停靠位置（滚动结束的位置），用于实现分页或对齐效果。
	override func targetContentOffset(forProposedContentOffset proposedContentOffset: CGPoint, withScrollingVelocity velocity: CGPoint) -> CGPoint {
		let targetOffset = super.targetContentOffset(forProposedContentOffset: proposedContentOffset, withScrollingVelocity: velocity)
		print(">> targetContentOffset(forProposedContentOffset:withScrollingVelocity:) - ProposedContentOffset: \(proposedContentOffset), Velocity: \(velocity), TargetOffset: \(targetOffset)")
		return targetOffset
	}
	
	/// 确定布局属性更新是否应导致布局无效化，以响应首选的布局属性变化。
	override func shouldInvalidateLayout(forPreferredLayoutAttributes preferredAttributes: UICollectionViewLayoutAttributes, withOriginalAttributes originalAttributes: UICollectionViewLayoutAttributes) -> Bool {
		let shouldInvalidate = super.shouldInvalidateLayout(forPreferredLayoutAttributes: preferredAttributes, withOriginalAttributes: originalAttributes)
		print(">> shouldInvalidateLayout(forPreferredLayoutAttributes:withOriginalAttributes:) - PreferredAttributes: \(preferredAttributes), OriginalAttributes: \(originalAttributes), ShouldInvalidate: \(shouldInvalidate)")
		return shouldInvalidate
	}
}
