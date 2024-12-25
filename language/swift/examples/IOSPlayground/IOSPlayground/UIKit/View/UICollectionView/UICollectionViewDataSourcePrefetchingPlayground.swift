//
//  UICollectionViewDataSourcePrefetchingPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/4.
//
import UIKit
import SnapKit

class UICollectionViewDataSourcePrefetchingPlayground: UICollectionViewController {
	
	var items: [Int] = []
	
	init() {
		
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 100)
		super.init(collectionViewLayout: layout)
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewDataSourcePrefetching"
		
		configureCollectionView()
		applyInitialData()
	}
	
	private func configureCollectionView() {
		collectionView.dataSource = self
		collectionView.prefetchDataSource = self
		collectionView.backgroundColor = .systemBackground
		collectionView.register(CustomCell.self, forCellWithReuseIdentifier: "Cell")
	}
	
	private func applyInitialData() {
		items = (1...100).map { $0 }
		collectionView.reloadData()
	}
	
	// 有多少个 Section
	override func numberOfSections(in collectionView: UICollectionView) -> Int {
		return 1
	}
	
	// 每个 Section 有多少 Item
	override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return items.count
	}
	
	// Item 构造
	override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "Cell", for: indexPath) as? CustomCell
		guard let cell = cell else {
			return UICollectionViewCell()
		}
		cell.label.text = "\(indexPath.item)"
		cell.contentView.backgroundColor = .blue
		return cell
	}
}

extension UICollectionViewDataSourcePrefetchingPlayground: UICollectionViewDataSourcePrefetching {
	// MARK: - UICollectionViewDataSourcePrefetching
	
	// 预加载数据
	func collectionView(_ collectionView: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
		print(">> prefetchItemsAt: \(indexPaths.map { $0.item })")
	}
	
	// 取消不再需要的预加载任务
	func collectionView(_ collectionView: UICollectionView, cancelPrefetchingForItemsAt indexPaths: [IndexPath]) {
		print(">> cancelPrefetchingForItemsAt: \(indexPaths.map { $0.item })")
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
