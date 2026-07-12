export interface MqttCommunication {
	publish(topic: string, message: string, qos: 0 | 1 | 2): void;
	subscribe(topic: string, onMessage: (message: string) => void, onSubscribed?: () => void): void;
}
