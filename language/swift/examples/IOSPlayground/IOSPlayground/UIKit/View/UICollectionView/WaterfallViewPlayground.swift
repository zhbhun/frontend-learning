//
//  WaterfallViewPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/25.
//

import UIKit

class WaterfallViewController: UIViewController, UICollectionViewDataSource {
	var collectionView: UICollectionView!
	var aspectRatios: [CGFloat] = []

	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Waterfall"
		
		view.backgroundColor = .white
		
		// 初始化随机宽高比数据
		for _ in 0..<100 {
			aspectRatios.append(CGFloat(Double.random(in: 0.5...1.5)))
		}
		
		// 设置自定义布局
		let layout = WaterfallLayout()
		layout.columns = 2
		layout.cellPadding = 15
		layout.aspectRatios = aspectRatios

		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .white
		collectionView.dataSource = self
		collectionView.register(WaterfallCell.self, forCellWithReuseIdentifier: WaterfallCell.identifier)
		
		view.addSubview(collectionView)
	}

	// MARK: - UICollectionViewDataSource
	
	func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return aspectRatios.count
	}

	func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: WaterfallCell.identifier, for: indexPath) as! WaterfallCell
		let aspectRatio = aspectRatios[indexPath.item]
		cell.configure(aspectRatio: aspectRatio)
		return cell
	}
}

fileprivate class WaterfallLayout: UICollectionViewFlowLayout {
	var columns: Int = 2
	var cellPadding: CGFloat = 15
	var aspectRatios: [CGFloat] = []  // 添加宽高比数组
	
	private var cache: [UICollectionViewLayoutAttributes] = []
	private var contentHeight: CGFloat = 0
	
	override func prepare() {
		guard let collectionView = collectionView else { return }
		cache.removeAll()
		
		let columnWidth = (collectionView.bounds.width / CGFloat(columns)) - cellPadding * 2
		var xOffset: [CGFloat] = []
		for column in 0..<columns {
			xOffset.append(CGFloat(column) * columnWidth + cellPadding * CGFloat(column + 1))
		}
		var yOffset = [CGFloat](repeating: 0, count: columns)
		var column = 0
		
		for item in 0..<collectionView.numberOfItems(inSection: 0) {
			let indexPath = IndexPath(item: item, section: 0)
			let aspectRatio = aspectRatios[item]  // 使用传入的宽高比数组中的值
			let itemHeight = columnWidth / aspectRatio
			let height = cellPadding * 2 + itemHeight
			let frame = CGRect(x: xOffset[column], y: yOffset[column], width: columnWidth, height: height)
			let insetFrame = frame.insetBy(dx: cellPadding, dy: cellPadding)
			
			let attributes = UICollectionViewLayoutAttributes(forCellWith: indexPath)
			attributes.frame = insetFrame
			cache.append(attributes)
			
			contentHeight = max(contentHeight, frame.maxY)
			yOffset[column] += height
			
			column = (column + 1) % columns
		}
	}
	
	override var collectionViewContentSize: CGSize {
		return CGSize(width: collectionView?.bounds.width ?? 0, height: contentHeight)
	}
	
	override func layoutAttributesForElements(in rect: CGRect) -> [UICollectionViewLayoutAttributes]? {
		return cache.filter { $0.frame.intersects(rect) }
	}
	
	override func layoutAttributesForItem(at indexPath: IndexPath) -> UICollectionViewLayoutAttributes? {
		return cache[indexPath.item]
	}
}

fileprivate class WaterfallCell: UICollectionViewCell {
	static let identifier = "WaterfallCell"
	
	private let aspectRatioLabel: UILabel = {
		let label = UILabel()
		label.textColor = .white
		label.font = UIFont.boldSystemFont(ofSize: 16)
		label.textAlignment = .center
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(aspectRatioLabel)
		aspectRatioLabel.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			aspectRatioLabel.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
			aspectRatioLabel.centerYAnchor.constraint(equalTo: contentView.centerYAnchor)
		])
		
		// 随机背景颜色
		contentView.backgroundColor = UIColor(
			red: .random(in: 0...1),
			green: .random(in: 0...1),
			blue: .random(in: 0...1),
			alpha: 1.0
		)
		
		contentView.layer.cornerRadius = 8
		contentView.layer.masksToBounds = true
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
	
	func configure(aspectRatio: CGFloat) {
		aspectRatioLabel.text = String(format: "Ratio: %.2f", aspectRatio)
	}
}
