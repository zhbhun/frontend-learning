import Fakery
import Foundation
import UIKit

class UITapGestureRecognizerPlayground: UITableViewController {
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(viewTapped(_:)))
        self.view.addGestureRecognizer(tapGesture)
        
        let view1 = UIView(frame: CGRect(x: 0, y: 0, width: 100, height: 100))
        view1.backgroundColor = .red
        self.view.addSubview(view1)
        
        let view2 = UIView(frame: CGRect(x: 100, y: 100, width: 100, height: 100))
        view2.backgroundColor = .blue
        self.view.addSubview(view2)
        
        let view3 = UIView(frame: CGRect(x: 200, y: 200, width: 100, height: 100))
        view3.backgroundColor = .green
        self.view.addSubview(view3)
        
        // 为 view1 添加触摸事件处理
        let tapGesture1 = UITapGestureRecognizer(target: self, action: #selector(view1Tapped(_:)))
        view1.addGestureRecognizer(tapGesture1)
        
        // 为 view2 添加触摸事件处理
        let tapGesture2 = UITapGestureRecognizer(target: self, action: #selector(view2Tapped(_:)))
        tapGesture2.numberOfTapsRequired = 2
        view2.addGestureRecognizer(tapGesture2)
        
        // 为 view3 添加触摸事件处理
        let tapGesture3 = UITapGestureRecognizer(target: self, action: #selector(view3Tapped(_:)))
        tapGesture3.numberOfTouchesRequired = 2
        view3.addGestureRecognizer(tapGesture3)

    }
    
    @objc func viewTapped(_ gesture: UITapGestureRecognizer) {
        print("View is tapped! \(gesture.view.hashValue) \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }
    
    @objc func view1Tapped(_ gesture: UITapGestureRecognizer) {
        print("View 1 is tapped! \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }
    
    @objc func view2Tapped(_ gesture: UITapGestureRecognizer) {
        print("View 2 is tapped! \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }

    @objc func view3Tapped(_ gesture: UITapGestureRecognizer) {
        print("View 3 is tapped! \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }
}

