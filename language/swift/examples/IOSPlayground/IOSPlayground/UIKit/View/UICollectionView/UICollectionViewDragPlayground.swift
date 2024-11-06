//
//  UICollectionViewDragPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/5.
//

import UIKit

class UICollectionViewDragPlayground: UIViewController, UICollectionViewDelegate {

	var collectionView: UICollectionView!
	var dataSource: [String] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]

	override func viewDidLoad() {
		super.viewDidLoad()
		
		title = "Drag"

		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: (UIScreen.main.bounds.width - 15 * 2 - 20 * 2) / 3, height: 100)
		collectionView = UICollectionView(frame: self.view.bounds, collectionViewLayout: layout)
		collectionView.contentInset = UIEdgeInsets(top: 10, left: 15, bottom: 10, right: 15)
		collectionView.backgroundColor = .white
		collectionView.delegate = self
		collectionView.dataSource = self
		collectionView.dragDelegate = self
		collectionView.dropDelegate = self
		collectionView.reorderingCadence = .immediate // 控制拖拽的响应速度
		collectionView.dragInteractionEnabled = true  // 启用拖拽交互
		collectionView.register(UICollectionViewCell.self, forCellWithReuseIdentifier: "Cell")

		self.view.addSubview(collectionView)
	}
}

// MARK: - UICollectionViewDataSource

extension UICollectionViewDragPlayground: UICollectionViewDataSource {
	func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return dataSource.count
	}

	func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "Cell", for: indexPath)
		cell.backgroundColor = .lightGray

		// Configure cell to show data
		let label = UILabel(frame: cell.contentView.bounds)
		label.text = dataSource[indexPath.item]
		label.textAlignment = .center
		label.tag = 100 // To identify and remove later
		cell.contentView.viewWithTag(100)?.removeFromSuperview() // Remove old label
		cell.contentView.addSubview(label)

		return cell
	}
}

// MARK: - UICollectionViewDragDelegate

extension UICollectionViewDragPlayground: UICollectionViewDragDelegate {
	func collectionView(_ collectionView: UICollectionView, itemsForBeginning session: UIDragSession, at indexPath: IndexPath) -> [UIDragItem] {
		let item = dataSource[indexPath.item] as NSString
		let itemProvider = NSItemProvider(object: item)
		let dragItem = UIDragItem(itemProvider: itemProvider)
		dragItem.localObject = item
		return [dragItem]
	}
}

// MARK: - UICollectionViewDropDelegate

extension UICollectionViewDragPlayground: UICollectionViewDropDelegate {
	func collectionView(_ collectionView: UICollectionView, performDropWith coordinator: UICollectionViewDropCoordinator) {
		guard let destinationIndexPath = coordinator.destinationIndexPath else { return }

		for item in coordinator.items {
			if let sourceIndexPath = item.sourceIndexPath {
				collectionView.performBatchUpdates({
					// Update data source
					let draggedItem = dataSource.remove(at: sourceIndexPath.item)
					dataSource.insert(draggedItem, at: destinationIndexPath.item)
					
					// Update collectionView
					collectionView.deleteItems(at: [sourceIndexPath])
					collectionView.insertItems(at: [destinationIndexPath])
				})
				coordinator.drop(item.dragItem, toItemAt: destinationIndexPath)
			} else {
				// Handle items dragged from outside
				let placeholder = coordinator.drop(
					item.dragItem,
					to: UICollectionViewDropPlaceholder(
						insertionIndexPath: destinationIndexPath,
						reuseIdentifier: "PlaceholderCell"
					)
				)
				item.dragItem.itemProvider.loadObject(ofClass: NSString.self) { (object, error) in
					DispatchQueue.main.async {
						if let draggedObject = object as? String {
							placeholder.commitInsertion { insertionIndexPath in
								self.dataSource.insert(draggedObject, at: insertionIndexPath.item)
							}
						} else {
							placeholder.deletePlaceholder()
						}
					}
				}
			}
		}
	}

	// 提供有关拖放行为的提案
	func collectionView(_ collectionView: UICollectionView, dropSessionDidUpdate session: UIDropSession, withDestinationIndexPath destinationIndexPath: IndexPath?) -> UICollectionViewDropProposal {
		return UICollectionViewDropProposal(operation: .move, intent: .insertAtDestinationIndexPath)
	}
}
