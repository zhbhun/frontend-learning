//
//  UICollectionPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/24.
//

import SnapKit
import UIKit

class UICollectionViewPlayground: ListViewController {
	override init() {
		super.init(controllers: [
			("UICollectionViewDataSource", UICollectionViewDataSourcePlayground.self),
			("UICollectionViewController", UICollectionViewControllerPlayground.self),
			("UICollectionViewDiffableDataSource", UICollectionViewDiffableDataSourcePlayground.self),
			("UICollectionViewDelegateFlowLayout", UICollectionViewDelegateFlowLayoutPlayground.self),
			("UICollectionView.CellRegistration", UICollectionViewCellRegistrationPlayground.self),
			("UICollectionView.SupplementaryRegistration", UICollectionViewSupplementaryRegistrationPlayground.self),
			("UICollectionViewCell", UICollectionViewCellPlayground.self),
			("UICollectionViewDelegate", UICollectionViewDelegatePlayground.self),
			("UICollectionViewFlowLayout", UICollectionViewFlowLayoutPlayground.self),
			("Drag and Drop", UICollectionViewDragPlayground.self),
			("UICollectionViewDataSourcePrefetching", UICollectionViewDataSourcePrefetchingPlayground.self),
			("Nesting", UICollectionViewNestingPlayground.self),
			("UICollectionViewWaterfallLayout", UICollectionViewWaterfallLayoutPlayground.self),
			("UICollectionViewCompositionalLayout", UICollectionViewCompositionalLayoutPlayground.self),
			("UICollectionViewCompositionalLayout...", UICVCLPlayground.self),
			("Waterfall by UICollectionViewCompositionalLayout", UICollectionViewCompositionalLayoutWaterfallPlayground.self)
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
}
