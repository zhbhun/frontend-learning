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
			("UICollectionViewDiffableDataSource", UICollectionViewDiffableDataSourcePlayground.self),
			("UICollectionViewDataSource", UICollectionViewDataSourcePlayground.self),
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
}
