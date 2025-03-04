//
//  PublisherPlayground.swift
//  IOSPlayground
//
//  Created by zhanghuabin on 2024/11/27.
//
import Combine

func publisherPlayground() {
	let publisher = Just("Hello, Combine!")
	let subscriber = Subscribers.Sink<String, Never>(
		receiveCompletion: { print("Completion: \($0)") },
		receiveValue: { print("Value: \($0)") }
	)
	publisher.subscribe(subscriber)
}


