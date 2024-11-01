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
			("UICollectionViewDiffableDataSource", UICollectionViewDiffableDataSourcePlayground.self),
			("UICollectionViewDelegateFlowLayout", UICollectionViewDelegateFlowLayoutPlayground.self),
			("UICollectionView.CellRegistration", UICollectionViewCellRegistrationPlayground.self),
			("UICollectionViewCell", UICollectionViewCellPlayground.self),
			("UICollectionViewDelegate", UICollectionViewDelegatePlayground.self),
			("UICollectionViewCompositionalLayout", UICVCLPlayground.self),
			("Waterfall", WaterfallViewController.self),
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
}
