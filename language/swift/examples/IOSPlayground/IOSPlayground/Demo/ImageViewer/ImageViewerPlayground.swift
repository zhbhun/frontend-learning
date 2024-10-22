//
//  ImageViewerPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/10/17.
//
import Foundation
import UIKit

class ImageViewerPlayground: UIViewController {
	override func viewDidLoad() {
		super.viewDidLoad()
		
		// 设置标题
		title = "ImageViewer"
		
		
		// 设置视图的背景颜色为白色
//		view.backgroundColor = .white
//		
//		// 创建一个 UIImageView 实例
//		let imageView = CustomImageView()
//		
//		// 设置图片 (确保图片在你的项目中)
//		let image = UIImage(named: "Swift") // "exampleImage" 是图片的名称
//		
////		imageView.image = image
//		
//		// 设置 imageView 的内容模式
//		imageView.contentMode = .scaleAspectFit
//		
//		imageView.backgroundColor = .red
//		
//		
//		// 启用自动布局
//		imageView.translatesAutoresizingMaskIntoConstraints = false
//		
//		// 将 imageView 添加到主视图中
//		view.addSubview(imageView)
//		
//		// 使用 Auto Layout 约束 imageView 的位置和大小
//		NSLayoutConstraint.activate([
//			imageView.topAnchor.constraint(equalTo: view.topAnchor),
//			imageView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
//			imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
//			imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
//		])
//		
//		
//		let matrix: [[Bool]] = [
//			[true, false, true],
//			[false, true, false],
//			[true, false, true]
//		]
//		imageView.setMatrix(matrix: matrix, image: image)
	}
}
