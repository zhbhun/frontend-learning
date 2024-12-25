//
//  UIListView.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/7.
//
import UIKit

open class UIFlowListView: UICollectionView {
	public init(frame: CGRect, layout: UIListViewLayout) {
		super.init(frame: frame, collectionViewLayout: layout.collectionViewLayout)
		// self.dataSource = dataSource
	}
	
	public required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}

open class UIListViewDataSource<SectionIdentifierType, ItemIdentifierType>:
	UICollectionViewDiffableDataSource<SectionIdentifierType, ItemIdentifierType> where
SectionIdentifierType : Hashable, SectionIdentifierType : Sendable,
ItemIdentifierType : Hashable, ItemIdentifierType : Sendable {
	init(collectionView: UICollectionView) {
		super.init(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			
			//			let section = Section.allCases[indexPath.section]
			//
			//			switch section {
			//			case .first:
			//				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "FirstCell", for: indexPath) as? CustomCell
			//				guard let cell = cell else { return UICollectionViewCell() }
			//				cell.label.text = item.title
			//				cell.contentView.backgroundColor = .red
			//				return cell
			//
			//			case .second:
			//				let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SecondCell", for: indexPath) as? CustomCell
			//				guard let cell = cell else { return UICollectionViewCell() }
			//				cell.label.text = item.title
			//				cell.contentView.backgroundColor = .blue
			//				return cell
			//			}
			return nil
		}
	}
}

public protocol UIListViewLayout {
	var collectionViewLayout: UICollectionViewLayout { get }
}

open class UIListViewFlowLayout: UIListViewLayout {
	public struct CellRegistration<Cell, Item> where Cell : UICollectionViewCell {
		public typealias Handler = (_ cell: Cell, _ indexPath: IndexPath, _ itemIdentifier: Item) -> Void
		
		private var _handler: Handler
		
		public init(handler: @escaping Handler) {
			self._handler = handler
		}
	}
	
	
	var collectionViewLayout: UICollectionViewLayout {
		return UICollectionViewFlowLayout()
	}
	
	
	
}

func test() {
	let listView = UIListView(
		frame: <#T##CGRect#>,
		layout: UIListViewFlowLayout(
			
		)
	)
}
