import UIKit

class CALayerPlayground: UIViewController {
	var demos: [Demo]!
	var demoListView: DemoListView!

	override func viewDidLoad() {
		view.backgroundColor = .white

		demos = [
			.init(
				title: "background",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview.layer.backgroundColor = UIColor.red.cgColor
					view.addSubview(subview)

					return view
				}
			),
			.init(
				title: "border",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview.layer.borderWidth = 2.0
					subview.layer.borderColor = UIColor.black.cgColor
					view.addSubview(subview)

					return view
				}
			),
			.init(
				title: "cornerRadius",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview1 = UIView(frame: CGRect(x: 15, y: 10, width: 100, height: 100))
					subview1.layer.borderWidth = 2.0
					subview1.layer.borderColor = UIColor.black.cgColor
					subview1.layer.cornerRadius = 10.0
					view.addSubview(subview1)

					let subview2 = UIView(frame: CGRect(x: 130, y: 10, width: 100, height: 100))
					subview2.layer.borderWidth = 2.0
					subview2.layer.borderColor = UIColor.black.cgColor
					subview2.layer.cornerRadius = 10.0
					subview2.layer.maskedCorners = [
						.layerMinXMinYCorner,
						.layerMaxXMaxYCorner,
					]
					view.addSubview(subview2)

					let subview3 = UIView(frame: CGRect(x: 245, y: 10, width: 100, height: 100))
					subview3.layer.borderWidth = 2.0
					subview3.layer.borderColor = UIColor.black.cgColor
					subview3.layer.cornerRadius = 10.0
					subview3.layer.maskedCorners = [
						.layerMaxXMinYCorner,
						.layerMinXMaxYCorner,
					]
					view.addSubview(subview3)

					return view
				}
			),
			.init(
				title: "opacity",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview.layer.backgroundColor = UIColor.red.cgColor
					subview.layer.opacity = 0.5
					view.addSubview(subview)

					return view
				}
			),
			.init(
				title: "animation",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(70)
					}

					let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
					rotation.fromValue = 0.0  // 起始角度（弧度制）
					rotation.toValue = Double.pi  // 终止角度 (180度，即 π 弧度)
					rotation.duration = 1.0  // 持续时间 1 秒
					rotation.repeatCount = .infinity  // 重复次数

					let scale = CABasicAnimation(keyPath: "transform.scale")
					scale.fromValue = 1.0
					scale.toValue = 0.5
					scale.duration = 1
					scale.autoreverses = true  // 动画结束时自动反转回初始状态
					scale.repeatCount = .infinity

					let fade = CABasicAnimation(keyPath: "opacity")
					fade.fromValue = 1.0
					fade.toValue = 0.0
					fade.duration = 1.0
					fade.autoreverses = true
					fade.repeatCount = .infinity

					let subview1 = UIView(frame: CGRect(x: 10, y: 10, width: 50, height: 50))
					subview1.layer.backgroundColor = UIColor.red.cgColor
					subview1.layer.add(rotation, forKey: "rotateAnimation")
					view.addSubview(subview1)

					let subview2 = UIView(frame: CGRect(x: 70, y: 10, width: 50, height: 50))
					subview2.layer.backgroundColor = UIColor.blue.cgColor
					subview2.layer.add(scale, forKey: "scaleAnimation")
					view.addSubview(subview2)

					let subview3 = UIView(frame: CGRect(x: 130, y: 10, width: 50, height: 50))
					subview3.layer.backgroundColor = UIColor.green.cgColor
					subview3.layer.add(fade, forKey: "fadeAnimation")
					view.addSubview(subview3)

					let subview4 = UIView(frame: CGRect(x: 190, y: 10, width: 50, height: 50))
					subview4.layer.backgroundColor = UIColor.red.cgColor
					let move = CABasicAnimation(keyPath: "position")
					move.fromValue = subview4.layer.position
					move.toValue = CGPoint(
						x: subview4.layer.position.x,
						y: subview4.layer.position.y - 10.0
					)
					move.duration = 1.0
					move.repeatCount = .infinity
					subview4.layer.add(move, forKey: "moveAnimation")
					view.addSubview(subview4)

					return view
				}
			),
			.init(
				title: "Shadow",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview.layer.backgroundColor = UIColor.red.cgColor
					subview.layer.shadowColor = UIColor.black.cgColor
					subview.layer.shadowOpacity = 0.7
					subview.layer.shadowOffset = CGSize(width: 4, height: 4)
					subview.layer.shadowRadius = 5.0
					view.addSubview(subview)

					return view
				}
			),
			.init(
				title: "Sublayer",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview1 = UIView(frame: CGRect(x: 10, y: 10, width: 100, height: 100))
					subview1.layer.backgroundColor = UIColor.lightGray.cgColor
					let childLayer1 = CALayer()
					childLayer1.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
					childLayer1.backgroundColor = UIColor.red.cgColor
					subview1.layer.addSublayer(childLayer1)
					view.addSubview(subview1)

					let subview2 = UIView(frame: CGRect(x: 120, y: 10, width: 100, height: 100))
					subview2.bounds = .init(x: 25, y: 25, width: 100, height: 100)
					subview2.layer.backgroundColor = UIColor.lightGray.cgColor
					let childLayer2 = CALayer()
					childLayer2.frame = CGRect(x: 25, y: 25, width: 50, height: 50)
					childLayer2.backgroundColor = UIColor.red.cgColor
					subview2.layer.addSublayer(childLayer2)
					view.addSubview(subview2)

					return view
				}
			),
			.init(
				title: "Custom",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(70)
					}

					let customLayer = MyLayer()
					customLayer.frame = CGRect(x: 10, y: 10, width: 50, height: 50)
					customLayer.contentsScale = UIScreen.main.scale
					customLayer.setNeedsDisplay()
					view.layer.addSublayer(customLayer)

					return view
				}
			),
			.init(
				title: "CATextLayer",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(70)
					}

					let textLayer = CATextLayer()
					textLayer.backgroundColor = UIColor.gray.cgColor
					textLayer.frame = CGRect(x: 10, y: 10, width: 200, height: 50)
					textLayer.string = "Hello, CALayer"
					textLayer.fontSize = 20
					textLayer.font = UIFont.systemFont(ofSize: 20)
					textLayer.foregroundColor = UIColor.black.cgColor
					textLayer.alignmentMode = .center
					textLayer.contentsScale = UIScreen.main.scale  // 设置内容缩放比确保高清
					view.layer.addSublayer(textLayer)

					return view
				}
			),
			.init(
				title: "CAShapeLayer",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(70)
					}

					// 绘制圆形（环形）边框
					let circleLayer = CAShapeLayer()
					circleLayer.frame = CGRect(x: 10, y: 10, width: 50, height: 50)
					let circlePath = UIBezierPath(ovalIn: CGRect(x: 0, y: 0, width: 50, height: 50))
					circleLayer.path = circlePath.cgPath  // 设置图形路径
					circleLayer.fillColor = UIColor.clear.cgColor  // 填充色透明（空心圆）
					circleLayer.strokeColor = UIColor.red.cgColor  // 边框颜色红色
					circleLayer.lineWidth = 5.0  // 边框线条宽度
					view.layer.addSublayer(circleLayer)

					// 绘制一条斜线
					let lineLayer = CAShapeLayer()
					lineLayer.frame = CGRect(x: 70, y: 10, width: 50, height: 50)
					// 创建一条从(0,0)到(50,50)的直线路径
					let linePath = UIBezierPath()
					linePath.move(to: CGPoint(x: 0, y: 0))
					linePath.addLine(to: CGPoint(x: 50, y: 50))
					lineLayer.path = linePath.cgPath
					lineLayer.strokeColor = UIColor.blue.cgColor  // 线条颜色蓝色
					lineLayer.lineWidth = 2.0
					view.layer.addSublayer(lineLayer)

					return view
				}
			),
			.init(
				title: "CAGradientLayer",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(70)
					}

					// 创建一个覆盖整个视图的渐变图层
					let gradientLayer = CAGradientLayer()
					gradientLayer.frame = CGRect(x: 10, y: 10, width: 100, height: 50)
					// 设置渐变的起始和终止颜色（这里从红色过渡到蓝色）
					gradientLayer.colors = [UIColor.red.cgColor, UIColor.blue.cgColor]
					// 可选：设置每个颜色所在位置（0~1），不设置则默认均匀分布
					// gradientLayer.locations = [0.0, 1.0]
					// 设置渐变方向：startPoint 和 endPoint 分别对应渐变的起点和终点
					gradientLayer.startPoint = CGPoint(x: 0, y: 0)  // 左上角
					gradientLayer.endPoint = CGPoint(x: 1, y: 1)  // 右下角（因此是对角线方向的渐变）
					// 将渐变图层插入到view的底部
					view.layer.insertSublayer(gradientLayer, at: 0)

					let radialLayer = CAGradientLayer()
					radialLayer.type = .radial  // 使用径向渐变
					radialLayer.frame = CGRect(x: 120, y: 10, width: 100, height: 50)
					radialLayer.colors = [
						UIColor.yellow.cgColor, UIColor.orange.cgColor, UIColor.red.cgColor,
					]
					radialLayer.locations = [0.0, 0.5, 1.0]  // 定义三色在渐变中的位置：中心、中间和边缘
					radialLayer.startPoint = CGPoint(x: 0.5, y: 0.5)  // 渐变中心（层中心）
					radialLayer.endPoint = CGPoint(x: 1, y: 1)  // 渐变的最外围点（这里相对坐标(1,1)为层的右下角）
					view.layer.addSublayer(radialLayer)

					return view
				}
			),
			.init(
				title: "CAGradientLayer",
				content: { () -> UIView in
					let view = UIView()
					view.snp.makeConstraints { make in
						make.height.equalTo(120)
					}

					let subview1 = UIView()
					subview1.frame = .init(x: 10, y: 10, width: 100, height: 100)
					let subview1Layer = CALayer()
					var transform = CATransform3DIdentity
					transform.m34 = -1.0 / 500
					subview1Layer.sublayerTransform = transform
					// 添加两个平面，一个在 Z 轴前面，一个在后面
					for i in 0..<2 {
						let layer = CALayer()
						layer.frame = CGRect(x: 0, y: 0, width: 100, height: 100)
						layer.backgroundColor = (i == 0 ? UIColor.red : UIColor.blue).cgColor
						layer.transform = CATransform3DMakeTranslation(
							0,
							0,
							CGFloat(i == 0 ? 50 : -50)
						)
						subview1Layer.addSublayer(layer)
					}
					// 旋转父层（会看到两个图层“粘”在一起，没深度感）
					subview1Layer.transform = CATransform3DRotate(
						subview1Layer.transform,
						.pi / 6,
						1,
						0,
						0
					)
					subview1.layer.addSublayer(subview1Layer)
					view.addSubview(subview1)

					let subview2 = UIView()
					subview2.frame = .init(x: 150, y: 10, width: 100, height: 100)
					let subview2Layer = CATransformLayer()
					subview2Layer.frame = .init(x: 0, y: 0, width: 100, height: 100)
					// 设置透视
					var perspective = CATransform3DIdentity
					perspective.m34 = -1.0 / 500
					subview2.layer.sublayerTransform = perspective
					func makeLayer(color: UIColor, z: CGFloat) -> CALayer {
						let l = CALayer()
						l.frame = CGRect(x: -50, y: -50, width: 100, height: 100)
						l.backgroundColor = color.cgColor
						l.transform = CATransform3DMakeTranslation(0, 0, z)
						return l
					}
					// 添加红色（Z = 50）和蓝色（Z = -50）两个图层
					let red = makeLayer(color: .red, z: 50)
					let blue = makeLayer(color: .blue, z: -50)
					let group = CATransformLayer()
					group.frame = CGRect(
						x: subview2.bounds.midX,
						y: subview2.bounds.midY,
						width: 0,
						height: 0
					)
					group.addSublayer(red)
					group.addSublayer(blue)
					subview2Layer.addSublayer(group)
					// 旋转 group，让你看到 3D 深度关系
					group.transform = CATransform3DRotate(CATransform3DIdentity, .pi / 6, 1, 0, 0)
					subview2.layer.addSublayer(subview2Layer)
					view.addSubview(subview2)

					return view
				}
			),
		]

		demoListView = .init(demos)
		view.addSubview(demoListView)
		demoListView.snp.makeConstraints { make in
			make.edges.equalToSuperview()
		}
	}
}

private class MyLayer: CALayer {
	override func draw(in ctx: CGContext) {
		// 绘制一个绿色填充矩形
		ctx.setFillColor(UIColor.green.cgColor)
		ctx.fill(CGRect(x: 0, y: 0, width: 50, height: 50))

		// 绘制一条从左上到右下的红色直线
		ctx.setStrokeColor(UIColor.red.cgColor)
		ctx.setLineWidth(2.0)
		ctx.move(to: CGPoint(x: 0, y: 0))
		ctx.addLine(to: CGPoint(x: bounds.width, y: bounds.height))
		ctx.strokePath()
	}
}
