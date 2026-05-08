package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// ExpoPushMessage matches the exact format Expo expects
type ExpoPushMessage struct {
	To    string            `json:"to"`
	Sound string            `json:"sound"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
}

// SendPushNotification fires a push notification to a specific device
func SendPushNotification(pushToken, title, body string, data map[string]string) error {
	// 1. Ensure it's a valid Expo token
	if pushToken == "" || pushToken[:17] != "ExponentPushToken" {
		return fmt.Errorf("invalid push token provided")
	}

	// 2. Build the message payload
	message := ExpoPushMessage{
		To:    pushToken,
		Sound: "default", // Plays the default notification sound on the phone
		Title: title,
		Body:  body,
		Data:  data, // Hidden payload (e.g., {"url": "/notifications"})
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	// 3. Fire it off to the Expo API
	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo API returned status code: %d", resp.StatusCode)
	}

	fmt.Println("Push Notification successfully dispatched to:", pushToken)
	return nil
}