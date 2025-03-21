//
//  ViewController.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2023/6/28.
//

import SnapKit
import UIKit

class ViewController: UICollectionViewController {

	let viewControllers: [(String, UIViewController.Type)] = [
		// ("ImageViewer", ImageViewerPlayground.self),
		("ReactivePlayground", ReactivePlayground.self),
		("UICollectionView", UICollectionViewPlayground.self),
		("UIView", UIViewPlayground.self),
		("UIColor", UIColorPlayground.self),
		("UILabel", UILabelPlayground.self),
		("UIImageView", UIImageViewPlayground.self),
		("UIStackView", UIStackViewPlayground.self),
		("NSLayoutConstraint", NSLayoutConstraintPlayground.self),
		("FlexLayout", FlexLayoutPlayground.self),
		("UITapGestureRecognizer", UITapGestureRecognizerPlayground.self),
		("UILongPressGestureRecognizer", UILongPressGestureRecognizerPlayground.self),
		("UIPageViewController", UIPageViewControllerPlayground.self),
		("UIPanGestureRecognizer", UIPanGestureRecognizerPlayground.self),
	]

	let styleControllers: [(String, UIViewController.Type)] = [
		("Frame", FramePlayground.self),
		("Margin", MarginPlayground.self),
		("Background", BackgroundPlayground.self),
		("Border", BorderPlayground.self),
		("Shadow", ShadowPlayground.self),
		("Corner Radius", CorderRadiusPlayground.self),
		("Text", TextPlayground.self),
		("Opacity", OpacityPlayground.self),
		("Visible", VisiblePlayground.self),
		("Transform", TransformPlayground.self),
		("CALayer", CALayerPlayground.self),
	]

	let layerControllers: [(String, UIViewController.Type)] = [
		("CALayer", CALayerPlayground.self),
	]

	init() {
		let layout = UICollectionViewFlowLayout()
		layout.itemSize = CGSize(width: UIScreen.main.bounds.width - 30, height: 50)
		layout.headerReferenceSize = CGSize(width: UIScreen.main.bounds.width, height: 50)
		layout.minimumLineSpacing = 0
		super.init(collectionViewLayout: layout)
	}

	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	override func viewDidLoad() {
		super.viewDidLoad()

		title = "Playground"

		collectionView.register(ListItem.self, forCellWithReuseIdentifier: "cell")
		collectionView.register(
			SectionItem.self, forSupplementaryViewOfKind: UICollectionView.elementKindSectionHeader,
			withReuseIdentifier: "header")
		collectionView.backgroundColor = UIColor(
			red: 245.0 / 255.0, green: 245.0 / 255.0, blue: 245.0 / 255.0, alpha: 1)
	}

	override func numberOfSections(in collectionView: UICollectionView) -> Int {
		return 3
	}

	override func collectionView(
		_ collectionView: UICollectionView, numberOfItemsInSection section: Int
	) -> Int {
		return section == 0
			? viewControllers.count
			: (section == 1 ? styleControllers.count : layerControllers.count)
	}

	override func collectionView(
		_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath
	) -> UICollectionViewCell {
		let cell =
			collectionView.dequeueReusableCell(withReuseIdentifier: "cell", for: indexPath)
			as? ListItem
		let controllers =
			indexPath.section == 0
			? viewControllers : (indexPath.section == 1 ? styleControllers : layerControllers)
		let text = controllers[indexPath.row].0
		cell?.configure(
			with: text, isFirst: indexPath.row == 0, isLast: indexPath.row == controllers.count - 1)
		return cell ?? UICollectionViewCell()
	}

	override func collectionView(
		_ collectionView: UICollectionView, viewForSupplementaryElementOfKind kind: String,
		at indexPath: IndexPath
	) -> UICollectionReusableView {
		let header =
			collectionView.dequeueReusableSupplementaryView(
				ofKind: UICollectionView.elementKindSectionHeader, withReuseIdentifier: "header",
				for: indexPath) as? SectionItem
		var text = ""
		if indexPath.section == 0 {
			text = "View"
		} else {
			text = "Style"
		}
		header?.configure(with: text)
		return header ?? UICollectionReusableView()
	}

	override func collectionView(
		_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath
	) {
		collectionView.deselectItem(at: indexPath, animated: true)
		let controllerClass: UIViewController.Type
		if indexPath.section == 0 {
			controllerClass = viewControllers[indexPath.row].1
		} else if indexPath.section == 1 {
			controllerClass = styleControllers[indexPath.row].1
		} else {
			controllerClass = layerControllers[indexPath.row].1
		}
		let viewController = controllerClass.init()
		navigationController?.pushViewController(viewController, animated: true)
	}
}

private class SectionItem: UICollectionReusableView {

	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .left
		label.font = UIFont.boldSystemFont(ofSize: 18)
		return label
	}()

	override init(frame: CGRect) {
		super.init(frame: frame)
		setupViews()
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
		setupViews()
	}

	private func setupViews() {
		addSubview(label)

		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}
	}

	func configure(with text: String) {
		label.text = text
	}
}

private class ListItem: UICollectionViewCell {

	let label: UILabel = {
		let label = UILabel()
		label.textAlignment = .left
		return label
	}()

	override init(frame: CGRect) {
		super.init(frame: frame)
		setupViews()
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
		setupViews()
	}

	private func setupViews() {
		contentView.addSubview(label)

		label.snp.makeConstraints { make in
			make.centerY.equalToSuperview()
			make.left.equalToSuperview().offset(15)
			make.right.equalToSuperview().offset(-15)
		}

		contentView.backgroundColor = .white
		contentView.clipsToBounds = true
	}

	func configure(with text: String, isFirst: Bool, isLast: Bool) {
		label.text = text
		contentView.layer.cornerRadius = 0
		if isFirst {
			contentView.layer.cornerRadius = 10
			contentView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
		}
		if isLast {
			contentView.layer.cornerRadius = 10
			contentView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
		}
	}
}
