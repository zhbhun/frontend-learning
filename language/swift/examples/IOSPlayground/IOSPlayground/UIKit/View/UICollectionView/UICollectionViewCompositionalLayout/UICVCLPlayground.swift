//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLPlayground: ListViewController {
	override init() {
		super.init(controllers: [
			("Item layoutSize", UICVCLItemLayoutSizePlayground.self),
			("Item ContentInsets", UICVCLItemContentInsetsPlayground.self),
			("Item edgeSpacing", UICVCLItemEdgeSpacingPlayground.self),
			("Item supplementaryItems", UICVCLItemSupplementaryItemsPlayground.self),
			("Group subitems", UICVCLGroupSubItemsPlayground.self),
			("Group interItemSpacing", UICVCLGroupInterItemSpacingPlayground.self),
			("Group contentInsets", UICVCLGroupContentInsetsPlayground.self),
			("Group edgeSpacing", UICVCLGroupEdgeSpacingPlayground.self),
			("Group nest", UICVCLGroupNestPlayground.self),
			("Section boundarySupplementaryItems", UICVCLSectionBoundarySupplementaryItemsPlayground.self),
			("Section pinned boundarySupplementaryItems", UICVCLSectionPinnedBoundarySupplementaryItemsPlayground.self),
			("Section decorationItems", UICVCLSectionDecorationItemsPlayground.self),
			("Section orthogonalScrollingBehavior", UICVCLSectionOrthogonalScrollingBehaviorPlayground.self),
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
}
