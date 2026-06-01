package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"strings"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

var (
	firebaseClient *messaging.Client
	firebaseOnce   sync.Once
)

func initFirebase() {
	firebaseOnce.Do(func() {
		ctx := context.Background()
		// Initialize using the local JSON file. 
		opt := option.WithCredentialsFile("firebase-service-account.json")
		app, err := firebase.NewApp(ctx, nil, opt)
		if err != nil {
			log.Printf("Error initializing firebase app: %v\n", err)
			return
		}
		
		client, err := app.Messaging(ctx)
		if err != nil {
			log.Printf("Error getting Messaging client: %v\n", err)
			return
		}
		firebaseClient = client
		log.Println("Firebase Cloud Messaging client initialized successfully!")
	})
}

// ExpoPushMessage matches the exact format Expo expects
type ExpoPushMessage struct {
	To    string            `json:"to"`
	Sound string            `json:"sound"`
	Title string            `json:"title"`
	Body  string            `json:"body"`
	Data  map[string]string `json:"data,omitempty"`
}

// SendPushNotification fires a push notification to a specific device (Expo or FCM)
func SendPushNotification(pushToken, title, body string, data map[string]string) error {
	if pushToken == "" {
		return fmt.Errorf("invalid push token provided (empty)")
	}

	// Route to Expo API
	if strings.HasPrefix(pushToken, "ExponentPushToken") {
		return sendExpoPush(pushToken, title, body, data)
	}

	// Route to Firebase FCM API (Web)
	return sendFirebasePush(pushToken, title, body, data)
}

func sendExpoPush(pushToken, title, body string, data map[string]string) error {
	message := ExpoPushMessage{
		To:    pushToken,
		Sound: "default",
		Title: title,
		Body:  body,
		Data:  data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		return err
	}

	resp, err := http.Post("https://exp.host/--/api/v2/push/send", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo API returned status code: %d", resp.StatusCode)
	}

	fmt.Println("Expo Push Notification successfully dispatched to:", pushToken)
	return nil
}

func sendFirebasePush(pushToken, title, body string, data map[string]string) error {
	initFirebase()
	if firebaseClient == nil {
		return fmt.Errorf("firebase client not initialized")
	}

	message := &messaging.Message{
		Token: pushToken,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	// Send a message to the device corresponding to the provided registration token.
	response, err := firebaseClient.Send(context.Background(), message)
	if err != nil {
		return err
	}

	fmt.Println("Firebase Push Notification successfully dispatched. Response:", response)
	return nil
}