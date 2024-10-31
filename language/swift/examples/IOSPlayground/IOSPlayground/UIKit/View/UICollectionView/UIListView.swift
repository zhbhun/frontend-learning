//
//  UIListView.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/31.
//
import UIKit

class UIListView: UICollectionView {
	
	init(frame: CGRect) {
		let layout = UICollectionViewFlowLayout()
		super.init(frame: frame, collectionViewLayout: layout)
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}

func test1() {
}
