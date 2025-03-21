import SnapKit
import UIKit

typealias DemoContentView = UIView.Type

typealias DemoContentRender = () -> UIView

class Demo: Hashable {
	let id: UUID
	let title: String
	let content: Any

	init(title: String, content: Any) {
		self.id = UUID()
		self.title = title
		self.content = content
	}

	func hash(into hasher: inout Hasher) {
		hasher.combine(id)
	}

	static func == (lhs: Demo, rhs: Demo) -> Bool {
		return lhs.id == rhs.id
	}
}

class DemoListView: UIView {
	let demos: [Demo]
	private let collectionView: UICollectionView
	private let diffableDataSource: UICollectionViewDiffableDataSource<Int, Demo>

	init(_ demos: [Demo]) {
		self.demos = demos
		
		let item = NSCollectionLayoutItem(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1),
				heightDimension: .estimated(10)
			)
		)
		let group = NSCollectionLayoutGroup.horizontal(
			layoutSize: NSCollectionLayoutSize(
				widthDimension: .fractionalWidth(1.0),
				heightDimension: .estimated(10)
			),
			subitems: [item]
		)
		let section = NSCollectionLayoutSection(group: group)
		let layout = UICollectionViewCompositionalLayout(section: section)
		self.collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)

		let cellRegistration = UICollectionView.CellRegistration<DemoCell, Demo> {
			(cell, indexPath, demo) in
			cell.update(demo)
		}

		self.diffableDataSource = UICollectionViewDiffableDataSource<Int, Demo>(
			collectionView: collectionView
		) {
			(collectionView, indexPath, demo) -> UICollectionViewCell? in
			return collectionView.dequeueConfiguredReusableCell(
				using: cellRegistration, for: indexPath, item: demo
			)
		}
		var snapshot = self.diffableDataSource.snapshot()
		snapshot.appendSections([0])
		snapshot.appendItems(demos, toSection: 0)
		self.diffableDataSource.applySnapshotUsingReloadData(snapshot)

		super.init(frame: .zero)

		self.addSubview(collectionView)
		collectionView.snp.makeConstraints { make in
			make.edges.equalToSuperview()
		}
	}

	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}
}

class DemoCell: UICollectionViewCell {
	private let title: UILabel = {
		let title = UILabel()
		title.font = .systemFont(ofSize: 16, weight: .medium)
		return title
	}()
	private let containerView: UIView = .init()
	private var currentDemo: Demo? = nil
	
	override init(frame: CGRect) {
		super.init(frame: frame)

		contentView.snp.makeConstraints { make in
			make.edges.equalToSuperview()
		}

		contentView.addSubview(title)
		title.snp.makeConstraints { make in
			make.top.equalToSuperview().offset(16)
			make.leading.equalToSuperview().offset(16)
			make.trailing.equalToSuperview().offset(-16)
			make.height.equalTo(32)
		}
		
		containerView.backgroundColor = .gray.withAlphaComponent(0.1)
		contentView.addSubview(containerView)
		containerView.snp.makeConstraints { make in
			make.top.equalTo(title.snp.bottom)
			make.leading.equalToSuperview().offset(16)
			make.trailing.equalToSuperview().offset(-16)
			make.bottom.equalToSuperview()
		}
	}

	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	func update(_ demo: Demo) {
		title.text = demo.title
		
		containerView.subviews.forEach {
			$0.removeFromSuperview()
		}
		
		if let content = demo.content as? DemoContentView {
			let content = content.init()
			containerView.addSubview(content)
			content.snp.makeConstraints { make in
				make.edges.equalToSuperview()
			}
		} else if let content = demo.content as? DemoContentRender {
			let content = content()
			containerView.addSubview(content)
			content.snp.makeConstraints { make in
				make.edges.equalToSuperview()
			}
		}
	}
}
