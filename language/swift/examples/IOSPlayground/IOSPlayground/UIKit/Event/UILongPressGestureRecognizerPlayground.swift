import Fakery
import Foundation
import UIKit

class UILongPressGestureRecognizerPlayground: UITableViewController {
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let tapGesture = UILongPressGestureRecognizer(target: self, action: #selector(rootviewTapped(_:)))
        self.view.addGestureRecognizer(tapGesture)
        
        let subView = UIView(frame: CGRect(x: 0, y: 0, width: 100, height: 100))
        subView.backgroundColor = .red
        self.view.addSubview(subView)
        let subViewTapGesture = UILongPressGestureRecognizer(target: self, action: #selector(subViewTapped(_:)))
        subView.addGestureRecognizer(subViewTapGesture)

    }
    
    @objc func rootviewTapped(_ gesture: UITapGestureRecognizer) {
        print("View is tapped! \(gesture.view.hashValue) \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }
    
    @objc func subViewTapped(_ gesture: UITapGestureRecognizer) {
        print("sub view is tapped! \(gesture.view.hashValue) \(gesture.state) \(gesture.location(in: self.view).x) \(gesture.location(in: self.view).y)")
    }
}

