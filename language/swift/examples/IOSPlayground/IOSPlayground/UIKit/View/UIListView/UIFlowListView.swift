//
//  UIListView.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/7.
//
//import UIKit
//
//
//public class UIListSection {
//	var sectionType: AnyHashable { get }
//}
//
//public struct UIFlowListSectionLayout {
//	public let sizeForItem: CGSize?
//	public let sizeForItemAt: Handler?
//	public typealias Handler = (
//		_ collectionView: UICollectionView,
//		_ collectionViewLayout: UICollectionViewLayout,
//		_ indexPath: IndexPath
//	) -> CGSize
//	
//	private let _insetForSection: UIEdgeInsets?
//	public var insetForSection: UIEdgeInsets? {
//		get {
//			return _insetForSection
//		}
//	}
//	
//	private let _minimumLineSpacingForSection: CGFloat?
//	public var minimumLineSpacingForSection: CGFloat? {
//		get {
//			return _minimumLineSpacingForSection
//		}
//	}
//	
//	private let _minimumInteritemSpacingForSection: CGFloat?
//	public var minimumInteritemSpacingForSection: CGFloat? {
//		get {
//			return _minimumInteritemSpacingForSection
//		}
//	}
//	
//	private var _sizeForHeader: CGSize?
//	public var sizeForHeader: CGSize? {
//		get {
//			return _sizeForHeader
//		}
//	}
//	
//	private var _sizeForFooter: CGSize?
//	public var sizeForFooter: CGSize? {
//		get {
//			return _sizeForFooter
//		}
//	}
//	
//	init(
//		sizeForItem: CGSize? = nil,
//		sizeForItemAt: Handler? = nil,
//		insetForSection: UIEdgeInsets? = nil,
//		minimumLineSpacingForSection: CGFloat? = nil,
//		minimumInteritemSpacingForSection: CGFloat? = nil,
//		sizeForHeader: CGSize? = nil,
//		sizeForFooter: CGSize? = nil
//	) {
//		self.sizeForItem = sizeForItem
//		self.sizeForItemAt = sizeForItemAt
//		_insetForSection = insetForSection
//		_minimumLineSpacingForSection = minimumLineSpacingForSection
//		_minimumInteritemSpacingForSection = minimumInteritemSpacingForSection
//		_sizeForHeader = sizeForHeader
//		_sizeForFooter = sizeForFooter
//	}
//}
//
//
//class UIFlowListView<SectionIdentifierType, ItemIdentifierType>: UICollectionView, UICollectionViewDelegateFlowLayout where
//SectionIdentifierType: Hashable, SectionIdentifierType: Sendable, SectionIdentifierType: UIListSectionType,
//ItemIdentifierType: Hashable, ItemIdentifierType: Sendable {
//	
//	private var sections: [AnyHashable: UIFlowListSectionLayout]!
//	private var diffableDataSource: UICollectionViewDiffableDataSource<SectionIdentifierType, ItemIdentifierType>!
//	
//	public init(frame: CGRect, sections: [AnyHashable: UIFlowListSectionLayout]) {
//		let layout = UICollectionViewFlowLayout()
//		
//		super.init(frame: frame, collectionViewLayout: layout)
//		let dataSource = UICollectionViewDiffableDataSource<SectionIdentifierType, ItemIdentifierType>(collectionView: self) {
//			(collectionView, indexPath, item) -> UICollectionViewCell? in
//			// 配置 cell
//			return nil
//		}
//		
//		self.sections = sections
//		self.dataSource = dataSource
//		self.diffableDataSource = dataSource
//	}
//	
//	public required init?(coder: NSCoder) {
//		fatalError("init(coder:) has not been implemented")
//	}
//	
//	// MARK: - UICollectionViewDelegateFlowLayout
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
//		let snapshot = diffableDataSource.snapshot()
//		let sectionType = snapshot.sectionIdentifiers[indexPath.section].sectionType
//		let section = sections[AnyHashable(sectionType)]
//		guard let section = section else { return .zero }
//		guard let sizeForItemAt = section.sizeForItemAt else {
//			return section.sizeForItem ?? .zero
//		}
//		return sizeForItemAt(collectionView, collectionViewLayout, indexPath)
//	}
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, insetForSectionAt section: Int) -> UIEdgeInsets {
//		return UIEdgeInsets.zero
//	}
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumLineSpacingForSectionAt section: Int) -> CGFloat {
//		return CGFloat.zero
//	}
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, minimumInteritemSpacingForSectionAt section: Int) -> CGFloat {
//		return CGFloat.zero
//	}
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> CGSize {
//		return CGSize.zero
//	}
//	
//	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForFooterInSection section: Int) -> CGSize {
//		return CGSize.zero
//	}
//}

//open class UIListViewDataSource<SectionIdentifierType, ItemIdentifierType>:
//	UICollectionViewDiffableDataSource<SectionIdentifierType, ItemIdentifierType> where
//SectionIdentifierType : Hashable, SectionIdentifierType : Sendable,
//ItemIdentifierType : Hashable, ItemIdentifierType : Sendable {
//	init(collectionView: UICollectionView) {
//		super.init(collectionView: collectionView) {
//			(collectionView, indexPath, item) -> UICollectionViewCell? in
//
//			//			let section = Section.allCases[indexPath.section]
//			//
//			//			switch section {
//			//			case .first:
//			//				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "FirstCell", for: indexPath) as? CustomCell
//			//				guard let cell = cell else { return UICollectionViewCell() }
//			//				cell.label.text = item.title
//			//				cell.contentView.backgroundColor = .red
//			//				return cell
//			//
//			//			case .second:
//			//				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SecondCell", for: indexPath) as? CustomCell
//			//				guard let cell = cell else { return UICollectionViewCell() }
//			//				cell.label.text = item.title
//			//				cell.contentView.backgroundColor = .blue
//			//				return cell
//			//			}
//			return nil
//		}
//	}
//}

//public protocol UIListViewLayout {
//	var collectionViewLayout: UICollectionViewLayout { get }
//}
//
//open class UIListViewFlowLayout: UIListViewLayout {
//	public struct CellRegistration<Cell, Item> where Cell : UICollectionViewCell {
//		public typealias Handler = (_ cell: Cell, _ indexPath: IndexPath, _ itemIdentifier: Item) -> Void
//
//		private var _handler: Handler
//
//		public init(handler: @escaping Handler) {
//			self._handler = handler
//		}
//	}
//
//
//	public var collectionViewLayout: UICollectionViewLayout {
//		return UICollectionViewFlowLayout()
//	}
//}

//enum TestSection: Int, UIListSection {
//	case one
//	case two
//	
//	var sectionType: AnyHashable {
//		rawValue
//	}
//}
//
//class TestItem: Hashable {
//	let id: UUID
//	var title: String
//	
//	init(id: UUID, title: String) {
//		self.id = id
//		self.title = title
//	}
//	
//	func hash(into hasher: inout Hasher) {
//		hasher.combine(id)
//	}
//	
//	static func == (lhs: TestItem, rhs: TestItem) -> Bool {
//		return lhs.id == rhs.id
//	}
//}
//
//func test() {
//	// 访问字典中的值
//	let listView = UIFlowListView<TestSection, TestItem>(
//		frame: CGRect.zero,
//		sections: [
//			TestSection.one.sectionType: .init(
//				// sizeForItem: .zero,
//				sizeForItemAt: { (collÏectionView, collectionViewLayout, indexPath) -> CGSize in
//					return .zero
//				},
//				insetForSection: .zero
//			)
//		]
//	)
//}
