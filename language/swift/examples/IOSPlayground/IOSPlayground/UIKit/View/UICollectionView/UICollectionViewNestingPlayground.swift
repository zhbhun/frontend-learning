//
//  TabbedViewController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/6.
//
import UIKit

class UICollectionViewNestingPlayground: UIViewController {
	
	let sections = Array(0...9)
	let itemsInSection: [[String]] = {
		return (0...9).map { sectionIndex in
			if (sectionIndex == 0) {
				return []
			}
			return (1...10).map { itemIndex in
				return "Item \(sectionIndex)-\(itemIndex)"
			}
		}
	}()
	
	var collectionView: UICollectionView!
	
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .white
		
		let layout = UICollectionViewFlowLayout()
		layout.scrollDirection = .vertical
		layout.sectionHeadersPinToVisibleBounds = false
		layout.sectionFootersPinToVisibleBounds = true
		layout.itemSize = CGSize(width: view.bounds.width - 30, height: 100)
		layout.sectionInset = .init(top: 10, left: 15, bottom: 10, right: 15)
		
		collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
		collectionView.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(collectionView)
		NSLayoutConstraint.activate([
			collectionView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
			collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
			collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
			collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
		])
		
		collectionView.dataSource = self
		collectionView.delegate = self
		
		collectionView.register(ItemCell.self, forCellWithReuseIdentifier: ItemCell.identifier)
		collectionView.register(HeaderView.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: HeaderView.identifier)
		collectionView.register(UICollectionViewNestingFooterView.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionFooter, withReuseIdentifier: UICollectionViewNestingFooterView.identifier)
	}
}

// MARK: - UICollectionView DataSource & Delegate
extension UICollectionViewNestingPlayground: UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {
	func numberOfSections(in collectionView: UICollectionView) -> Int {
		return sections.count
	}
	
	func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return itemsInSection[section].count
	}
	
	func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: ItemCell.identifier, for: indexPath) as? ItemCell
		guard let cell = cell else { return UICollectionViewCell() }
		cell.label.text = itemsInSection[indexPath.section][indexPath.item]
		return cell
	}
	
	// Header - 顶部图片
	func collectionView(_ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String, at indexPath: IndexPath) -> UICollectionReusableView {
		if (indexPath.section == 0) {
			if kind == UICollectionView.elementKindSectionHeader  {
				let header = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: HeaderView.identifier, for: indexPath) as? HeaderView
				guard let header = header else { return UICollectionReusableView() }
				return header
			} else if kind == UICollectionView.elementKindSectionFooter {
				let footer = collectionView.dequeueReusableSupplementaryView(ofKind: kind, withReuseIdentifier: UICollectionViewNestingFooterView.identifier, for: indexPath) as? UICollectionViewNestingFooterView
				guard let footer = footer else { return UICollectionReusableView() }
				footer.sections = sections
				footer.delegate = self
				return footer
			}
		}
		return UICollectionReusableView()
	}
	
	// Header 尺寸
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForHeaderInSection section: Int) -> CGSize {
		return section == 0 ? CGSize(width: collectionView.frame.width, height: 200) : CGSize.zero
	}
	
	// Footer 尺寸
	func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, referenceSizeForFooterInSection section: Int) -> CGSize {
		return section == 0 ? CGSize(width: collectionView.frame.width, height: 50) : CGSize.zero
	}
}

// MARK: - Footer Delegate
extension UICollectionViewNestingPlayground: UICollectionViewNestingFooterViewDelegate {
	func footerView(_ footerView: UICollectionViewNestingFooterView, didSelectSectionAt index: Int) {
		let indexPath = IndexPath(item: 0, section: index + 1)
		collectionView.scrollToItem(at: indexPath, at: .top, animated: true)
	}
}

fileprivate class HeaderView: UICollectionReusableView {
	static let identifier = "HeaderView"
	
	let imageView: UIView = {
		let imageView = UIView()
		imageView.backgroundColor = .gray
		return imageView
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		addSubview(imageView)
		imageView.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			imageView.topAnchor.constraint(equalTo: topAnchor),
			imageView.bottomAnchor.constraint(equalTo: bottomAnchor),
			imageView.leadingAnchor.constraint(equalTo: leadingAnchor),
			imageView.trailingAnchor.constraint(equalTo: trailingAnchor)
		])
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}


protocol UICollectionViewNestingFooterViewDelegate: AnyObject {
	func footerView(_ footerView: UICollectionViewNestingFooterView, didSelectSectionAt index: Int)
}

class UICollectionViewNestingFooterView: UICollectionReusableView {
	static let identifier = "FooterView"
	
	weak var delegate: UICollectionViewNestingFooterViewDelegate?
	var sections: [Int] = [] {
		didSet {
			collectionView.reloadData()
		}
	}
	
	private let collectionView: UICollectionView = {
		let layout = UICollectionViewFlowLayout()
		layout.scrollDirection = .horizontal
		layout.minimumLineSpacing = 10
		layout.itemSize = CGSize(width: 100, height: 40)
		layout.sectionInset = .init(top: 5, left: 15, bottom: 5, right: 15)
		return UICollectionView(frame: .zero, collectionViewLayout: layout)
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		addSubview(collectionView)
		collectionView.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			collectionView.topAnchor.constraint(equalTo: topAnchor),
			collectionView.bottomAnchor.constraint(equalTo: bottomAnchor),
			collectionView.leadingAnchor.constraint(equalTo: leadingAnchor),
			collectionView.trailingAnchor.constraint(equalTo: trailingAnchor)
		])
		
		collectionView.register(TabCell.self, forCellWithReuseIdentifier: TabCell.identifier)
		collectionView.dataSource = self
		collectionView.delegate = self
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}

extension UICollectionViewNestingFooterView: UICollectionViewDataSource, UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
		return sections.count
	}
	
	func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
		let cell = collectionView.dequeueReusableCell(withReuseIdentifier: TabCell.identifier, for: indexPath) as? TabCell
		guard let cell = cell else { return UICollectionViewCell() }
		cell.label.text = "\([indexPath.item + 1])"
		return cell
	}
	
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		delegate?.footerView(self, didSelectSectionAt: indexPath.item)
	}
}

fileprivate class ItemCell: UICollectionViewCell {
	static let identifier = "ItemCell"
	
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.font = .systemFont(ofSize: 16, weight: .regular)
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		label.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			label.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
			label.centerYAnchor.constraint(equalTo: contentView.centerYAnchor)
		])
		contentView.backgroundColor = .systemGray5
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}


fileprivate class TabCell: UICollectionViewCell {
	static let identifier = "TabCell"
	
	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .center
		label.font = .systemFont(ofSize: 16, weight: .bold)
		return label
	}()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		contentView.addSubview(label)
		label.translatesAutoresizingMaskIntoConstraints = false
		NSLayoutConstraint.activate([
			label.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
			label.centerYAnchor.constraint(equalTo: contentView.centerYAnchor)
		])
		contentView.backgroundColor = .systemGray4
		contentView.layer.cornerRadius = 8
		contentView.clipsToBounds = true
	}
	
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}
