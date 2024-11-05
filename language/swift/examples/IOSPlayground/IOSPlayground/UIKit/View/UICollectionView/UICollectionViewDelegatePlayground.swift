//
//  UICollectionViewDelegatePlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//
import UIKit
import SnapKit

class UICollectionViewDelegatePlayground: UIViewController {
	enum Section: Int, CaseIterable {
		case main
	}
	
	class Item: Hashable {
		let id: UUID
		var title: String
		
		init(id: UUID, title: String) {
			self.id = id
			self.title = title
		}
		
		func hash(into hasher: inout Hasher) {
			hasher.combine(id)
		}
		
		static func == (lhs: Item, rhs: Item) -> Bool {
			return lhs.id == rhs.id
		}
	}
	
	var collectionView: UICollectionView! = nil
	var diffableDataSource: UICollectionViewDiffableDataSource<Section, Item>! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "UICollectionViewDelegate"
		
		configureCollectionView()
		configureDataSource()
		applyInitialSnapshot()
		setupNavigation()
	}
	
	func setupNavigation() {
		let action = UIAction { [weak self] _ in
			guard let self = self else { return }
			self.collectionView.allowsMultipleSelection.toggle()
			self.navigationItem.rightBarButtonItem?.title = self.collectionView.allowsMultipleSelection ? "单选" : "多选"
			self.deselectAllItems()
		}
		let button = UIBarButtonItem(title: "多选", image: nil, primaryAction: action, menu: nil)
		navigationItem.rightBarButtonItem = button
	}
	
	func deselectAllItems() {
		guard let selectedIndexPaths = collectionView.indexPathsForSelectedItems else { return }
		for indexPath in selectedIndexPaths {
			collectionView.deselectItem(at: indexPath, animated: true)
			
			if let cell = collectionView.cellForItem(at: indexPath) as? CustomCollectionViewCell {
				cell.hideIcon()
			}
		}
	}
}

extension UICollectionViewDelegatePlayground {
	private func configureCollectionView() {
		let layout = UICollectionViewFlowLayout()
		layout.minimumLineSpacing = 10
		layout.minimumLineSpacing = 10
		layout.sectionInset = .init(top: 10, left: 15, bottom: 10, right: 15)
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 15 * 2, height: 300)
		
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: layout)
		collectionView.backgroundColor = .systemBackground
		collectionView.delegate = self
		view.addSubview(collectionView)
	}
	
	private func configureDataSource() {
		// 使用 CellRegistration 配置单元格
		let cellRegistration = UICollectionView.CellRegistration<CustomCollectionViewCell, Item> { (cell, indexPath, item) in
			cell.label.text = item.title
		}
		
		diffableDataSource = UICollectionViewDiffableDataSource<Section, Item>(collectionView: collectionView) {
			(collectionView, indexPath, item) -> UICollectionViewCell? in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: item)
		}
	}
	
	// 应用初始快照
	private func applyInitialSnapshot() {
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
		snapshot.appendSections([.main])
		
		// 创建并添加初始数据
		snapshot.appendItems((1...10).map { Item(id: UUID(), title: "\($0)") }, toSection: .main)
		
		diffableDataSource.applySnapshotUsingReloadData(snapshot)
	}
}

extension UICollectionViewDelegatePlayground: UICollectionViewDelegate {
	
	/// - Tag: highlight
	func collectionView(_ collectionView: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
		return true
	}
	
	func collectionView(_ collectionView: UICollectionView, didHighlightItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) {
			cell.contentView.backgroundColor = .blue
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, didUnhighlightItemAt indexPath: IndexPath) {
		if let cell = collectionView.cellForItem(at: indexPath) {
			cell.contentView.backgroundColor = .red
		}
	}
	
	/// - Tag: selection
	func collectionView(_ collectionView: UICollectionView, shouldSelectItemAt indexPath: IndexPath) -> Bool {
		return true
	}
	
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		print(">> didSelectItemAt: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
		if let cell = collectionView.cellForItem(at: indexPath) as? CustomCollectionViewCell {
			cell.showIcon()
		}
	}
	
	func collectionView(_ collectionView: UICollectionView, didDeselectItemAt indexPath: IndexPath) {
		print(">> didDeselectItemAt: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
		if let cell = collectionView.cellForItem(at: indexPath) as? CustomCollectionViewCell {
			cell.hideIcon()
		}
	}
	
	/// - Tag: display
	func collectionView(_ collectionView: UICollectionView, willDisplay cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
		print(">> willDisplay: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
	}
	
	func collectionView(_ collectionView: UICollectionView, willDisplaySupplementaryView view: UICollectionReusableView, forElementKind elementKind: String, at indexPath: IndexPath) {
		print(">> willDisplaySupplementaryView: forElementKind=\(elementKind),  section=\(indexPath.section)")
	}
	
	func collectionView(_ collectionView: UICollectionView, didEndDisplaying cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
		print(">> didEndDisplaying: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
	}
	
	func collectionView(_ collectionView: UICollectionView, didEndDisplayingSupplementaryView view: UICollectionReusableView, forElementOfKind elementKind: String, at indexPath: IndexPath) {
		print(">> didEndDisplayingSupplementaryView: forElementOfKind=\(elementKind), section=\(indexPath.section + 1)")
	}
	
	// - Tag: primary action
	func collectionView(_ collectionView: UICollectionView, canPerformPrimaryActionForItemAt indexPath: IndexPath) -> Bool {
		print(">> canPerformPrimaryActionForItemAt: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
		return true
	}
	
	func collectionView(_ collectionView: UICollectionView, performPrimaryActionForItemAt indexPath: IndexPath) {
		print(">> performPrimaryActionForItemAt: section=\(indexPath.section + 1), item=\(indexPath.item + 1)")
	}
	
	// - Tag: menu
	func collectionView(_ collectionView: UICollectionView, contextMenuConfigurationForItemAt indexPath: IndexPath, point: CGPoint) -> UIContextMenuConfiguration? {
		return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { suggestedActions in
			let deleteAction = UIAction(title: "Delete", image: UIImage(systemName: "trash"), attributes: .destructive) { action in
				print("Delete \(indexPath.item)")
			}
			
			let detailAction = UIAction(title: "Details", image: UIImage(systemName: "info.circle")) { action in
				print("Show details for \(indexPath.item)")
			}
			
			return UIMenu(title: "", children: [detailAction, deleteAction])
		}
	}
}


fileprivate class CustomCollectionViewCell: UICollectionViewCell {
	var icon: UIImageView!
	var label: UILabel!
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		icon = UIImageView(image: UIImage(systemName: "play"))
		icon.alpha = 0.0
		contentView.addSubview(icon)
		icon.snp.makeConstraints { make in
			make.center.equalToSuperview()
			make.width.height.equalTo(24)
		}
		label = UILabel()
		label.textColor = .white
		contentView.addSubview(label)
		label.snp.makeConstraints { make in
			make.top.equalToSuperview().offset(10)
			make.leading.equalToSuperview().offset(10)
		}
		contentView.backgroundColor = .red
	}
	
	required init?(coder: NSCoder) {
		super.init(coder: coder)
	}
	
	func showIcon() {
		icon.alpha = 1.0
	}
	
	func hideIcon() {
		icon.alpha = 0.0
	}
}
