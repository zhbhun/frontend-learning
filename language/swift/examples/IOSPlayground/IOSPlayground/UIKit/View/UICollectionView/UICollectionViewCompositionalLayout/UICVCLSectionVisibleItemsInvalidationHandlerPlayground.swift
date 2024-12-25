//
//  UICollectionViewCompositionalLayoutPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/29.
//

import UIKit

class UICVCLSectionVisibleItemsInvalidationHandlerPlayground: UIViewController {
	
	enum Section: Int, CaseIterable {
		case main
	}
	var dataSource: UICollectionViewDiffableDataSource<Section, Int>! = nil
	var collectionView: UICollectionView! = nil
	
	override func viewDidLoad() {
		super.viewDidLoad()
		navigationItem.title = "Section visibleItemsInvalidationHandler"
		configureHierarchy()
		configureDataSource()
		configureFloatButton()
	}
}

extension UICVCLSectionVisibleItemsInvalidationHandlerPlayground {
	
	func createLayout() -> UICollectionViewLayout {
		let config = UICollectionViewCompositionalLayoutConfiguration()
		config.interSectionSpacing = 20
		
		let layout = UICollectionViewCompositionalLayout(sectionProvider: {
			(sectionIndex: Int, layoutEnvironment: NSCollectionLayoutEnvironment) -> NSCollectionLayoutSection? in
			let item = NSCollectionLayoutItem(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(0.5),
					heightDimension: .fractionalHeight(1.0)
				)
			)
			item.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 10, bottom: 10, trailing: 10)
			
			let containerGroup = NSCollectionLayoutGroup.horizontal(
				layoutSize: NSCollectionLayoutSize(
					widthDimension: .fractionalWidth(1.0),
					heightDimension: .fractionalWidth(0.5)
				),
				subitems: [item, item]
			)
			containerGroup.interItemSpacing = .fixed(20)
			containerGroup.contentInsets = .init(top: 10, leading: 15, bottom: 10, trailing: 15)
			
			let section = NSCollectionLayoutSection(group: containerGroup)
			section.orthogonalScrollingBehavior = .continuous
			section.visibleItemsInvalidationHandler = { [weak self] (visibleItems, offset, environment) in
				guard let self = self else { return }
				visibleItems.forEach { item in
					if item.representedElementCategory == .cell {
						let distanceFromCenter = abs((item.frame.midX - offset.x) - environment.container.contentSize.width / 2.0)
						let minScale: CGFloat = 0.7
						let maxScale: CGFloat = 1.1
						let scale = CGFloat.maximum(maxScale - (distanceFromCenter / environment.container.contentSize.width), minScale)
						item.transform = CGAffineTransform(scaleX: scale, y: scale)
						let minAlpha: CGFloat = 0.5
						let maxAlpha: CGFloat = 1
						let alpha = CGFloat.maximum(maxAlpha - (distanceFromCenter / environment.container.contentSize.width), minAlpha)
						item.alpha = alpha
						
						if let cell = self.collectionView.cellForItem(at: item.indexPath) as? TextCell {
							cell.label.textColor = UIColor(
								red: CGFloat.minimum(distanceFromCenter / (environment.container.contentSize.width / 2), 1),
								green: 0,
								blue: 0,
								alpha: 1
							)
						}
					}
				}
			}
			return section
			
		}, configuration: config)
		return layout
	}
}

extension UICVCLSectionVisibleItemsInvalidationHandlerPlayground {
	func configureHierarchy() {
		collectionView = UICollectionView(frame: view.bounds, collectionViewLayout: createLayout())
		collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
		collectionView.backgroundColor = .systemBackground
		view.addSubview(collectionView)
		collectionView.delegate = self
	}
	func configureDataSource() {
		
		let cellRegistration = UICollectionView.CellRegistration<TextCell, Int> { (cell, indexPath, identifier) in
			// Populate the cell with our item description.
			cell.label.text = "\(indexPath.item)"
			cell.contentView.backgroundColor = .systemBlue
			cell.contentView.layer.borderColor = UIColor.black.cgColor
			cell.contentView.layer.borderWidth = 1
			cell.contentView.layer.cornerRadius = 8
			cell.label.textAlignment = .center
			cell.label.font = UIFont.preferredFont(forTextStyle: .title1)
		}
		
		dataSource = UICollectionViewDiffableDataSource<Section, Int>(collectionView: collectionView) {
			(collectionView: UICollectionView, indexPath: IndexPath, identifier: Int) -> UICollectionViewCell? in
			return collectionView.dequeueConfiguredReusableCell(using: cellRegistration, for: indexPath, item: identifier)
		}
		
		// initial data
		var snapshot = NSDiffableDataSourceSnapshot<Section, Int>()
		var identifierOffset = 0
		let itemsPerSection = 18
		Section.allCases.forEach {
			snapshot.appendSections([$0])
			let maxIdentifier = identifierOffset + itemsPerSection
			snapshot.appendItems(Array(identifierOffset..<maxIdentifier))
			identifierOffset += itemsPerSection
		}
		dataSource.apply(snapshot, animatingDifferences: false)
	}

	func configureFloatButton() {
		let stackView = UIStackView()
		stackView.axis = .horizontal
		stackView.distribution = .fillEqually
		stackView.spacing = 10
		
		// 添加到主视图
		stackView.translatesAutoresizingMaskIntoConstraints = false
		view.addSubview(stackView)
		NSLayoutConstraint.activate([
			stackView.heightAnchor.constraint(equalToConstant: 50),
			stackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
			stackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
			stackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20)
		])
		
		func createScrollButton(title: String, action: @escaping () -> Void) -> UIButton {
			let button = UIButton(type: .system)
			button.setTitle(title, for: .normal)
			button.backgroundColor = .systemBlue
			button.setTitleColor(.white, for: .normal)
			button.layer.cornerRadius = 25
			button.clipsToBounds = true
			button.translatesAutoresizingMaskIntoConstraints = false
			button.heightAnchor.constraint(equalToConstant: 50).isActive = true
			
			button.addAction(UIAction { _ in
				action()
			}, for: .touchUpInside)
			return button
		}

		let leftButton = createScrollButton(title: "L") { [weak self] in
			guard let self = self else { return }
			self.collectionView.scrollToItem(at: .init(item: 6, section: 0), at: .left, animated: true)
		}
		
		let centerButton = createScrollButton(title: "C") { [weak self] in
			guard let self = self else { return }
			self.collectionView.scrollToItem(at: .init(item: 6, section: 0), at: .centeredHorizontally, animated: true)
		}
		
		let rightButton = createScrollButton(title: "R") { [weak self] in
			guard let self = self else { return }
			self.collectionView.scrollToItem(at: .init(item: 6, section: 0), at: .right, animated: true)
		}
		
		[leftButton, centerButton, rightButton].forEach { stackView.addArrangedSubview($0) }
	}
}

extension UICVCLSectionVisibleItemsInvalidationHandlerPlayground: UICollectionViewDelegate {
	func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
		collectionView.deselectItem(at: indexPath, animated: true)
	}
}


fileprivate class TextCell: UICollectionViewCell {
	let label = UILabel()
	
	override init(frame: CGRect) {
		super.init(frame: frame)
		configure()
	}
	
	required init?(coder: NSCoder) {
		fatalError("not implemnted")
	}
}

extension TextCell {
	func configure() {
		label.translatesAutoresizingMaskIntoConstraints = false
		label.adjustsFontForContentSizeCategory = true
		label.font = UIFont.preferredFont(forTextStyle: .caption1)
		contentView.addSubview(label)
		let inset = CGFloat(10)
		NSLayoutConstraint.activate([
			label.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: inset),
			label.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -inset),
			label.topAnchor.constraint(equalTo: contentView.topAnchor, constant: inset),
			label.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -inset)
		])
	}
}
